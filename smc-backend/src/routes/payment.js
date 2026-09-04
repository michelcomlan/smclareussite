const express = require('express');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { requireTelephoneVerifie } = require('../middleware/auth');
const { fedapayClient } = require('../config/fedapay');
const { DUREE_JOURS, genererCodeAbonnement } = require('./abonnement');

const router = express.Router();

/**
 * POST /api/payment/initier
 * body: { qcm_id, telephone }
 *
 * Crée un enregistrement "achat" en statut "en_attente", puis crée la
 * transaction FedaPay et renvoie l'URL de paiement à ouvrir côté client.
 * Le montant vient de la base (jamais du front), pour éviter qu'un client
 * ne manipule le prix envoyé.
 */
router.post('/initier', async (req, res) => {
  const { qcm_id, telephone } = req.body || {};

  if (!qcm_id || !telephone) {
    return res.status(400).json({ error: 'qcm_id et telephone sont requis.' });
  }

  // 1. Récupérer le QCM et son prix réel côté serveur
  const { data: qcm, error: qcmError } = await supabase
    .from('qcm')
    .select('id, titre, prix, publie')
    .eq('id', qcm_id)
    .maybeSingle();

  if (qcmError) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!qcm || !qcm.publie) return res.status(404).json({ error: 'QCM introuvable ou indisponible.' });

  // 2. Créer l'achat en attente
  const { data: achat, error: achatError } = await supabase
    .from('achat')
    .insert({
      qcm_id: qcm.id,
      telephone,
      montant: qcm.prix,
      statut: 'en_attente',
    })
    .select()
    .single();

  if (achatError) {
    console.error('Erreur Supabase (création achat):', achatError);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  // 3. Créer la transaction FedaPay
  try {
    const { data: transaction } = await fedapayClient.post('/transactions', {
      description: `Achat QCM : ${qcm.titre}`,
      amount: qcm.prix,
      currency: { iso: 'XOF' },
      callback_url: `${process.env.FRONTEND_URL}/paiement/retour?achat_id=${achat.id}`,
      customer: {
        phone_number: { number: telephone, country: 'BJ' },
      },
    });

    const transactionId = transaction['v1/transaction'].id;

    // On enregistre l'ID de transaction FedaPay pour pouvoir le relier au webhook
    await supabase
      .from('achat')
      .update({ reference_transaction: String(transactionId) })
      .eq('id', achat.id);

    // 4. Générer le lien de paiement (token FedaPay)
    const { data: tokenData } = await fedapayClient.post(
      `/transactions/${transactionId}/token`
    );

    res.status(201).json({
      achat_id: achat.id,
      paiement_url: tokenData['v1/transaction']?.payment_url || tokenData.url,
    });
  } catch (err) {
    console.error('Erreur FedaPay (initiation):', err.response?.data || err.message);
    // On marque l'achat comme échoué pour ne pas laisser un enregistrement fantôme
    await supabase.from('achat').update({ statut: 'echoue' }).eq('id', achat.id);
    res.status(502).json({ error: 'Impossible d\'initier le paiement pour le moment.' });
  }
});

/**
 * GET /api/payment/statut/:achat_id
 * Permet au front de vérifier (polling) si le paiement a été confirmé,
 * pendant que le client attend la confirmation du webhook.
 */
router.get('/statut/:achat_id', async (req, res) => {
  const { data, error } = await supabase
    .from('achat')
    .select('id, statut, qcm_id, token_acces')
    .eq('id', req.params.achat_id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!data) return res.status(404).json({ error: 'Achat introuvable.' });

  res.json({
    statut: data.statut,
    // Le token d'accès n'est renvoyé que si le paiement est confirmé
    token_acces: data.statut === 'confirme' ? data.token_acces : undefined,
  });
});

/**
 * GET /api/payment/retrouver
 * Header requis : Authorization: Bearer <token "téléphone vérifié">
 *
 * Permet à un étudiant qui a changé de navigateur de retrouver ses achats
 * confirmés. Protégé par vérification OTP (voir /api/otp) : le numéro de
 * téléphone utilisé pour la recherche vient du token vérifié, jamais d'un
 * paramètre de requête — impossible de consulter les achats d'un autre
 * numéro sans avoir reçu et validé son code SMS.
 */
router.get('/retrouver', requireTelephoneVerifie, async (req, res) => {
  const telephone = req.telephoneVerifie;

  const { data, error } = await supabase
    .from('achat')
    .select('id, qcm_id, token_acces, created_at, qcm(titre)')
    .eq('telephone', telephone)
    .eq('statut', 'confirme')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/**
 * POST /api/payment/webhook
 * Endpoint appelé par FedaPay pour confirmer un paiement.
 *
 * SÉCURITÉ CRITIQUE : on vérifie la signature du webhook avant de faire
 * confiance à son contenu. Sans cette vérification, n'importe qui pourrait
 * appeler cet endpoint pour débloquer un QCM sans payer.
 *
 * Ce endpoint doit être configuré dans le tableau de bord FedaPay (section
 * "Webhooks") avec l'URL publique du back-end
 * (ex: https://smclareussite.onrender.com/api/payment/webhook).
 *
 * Format vérifié auprès de la documentation officielle FedaPay : l'en-tête
 * X-FEDAPAY-SIGNATURE contient "t=<timestamp>,v1=<signature>" (comme Stripe),
 * où la signature est un HMAC-SHA256 hexadécimal du message
 * "<timestamp>.<corps brut de la requête>", avec le secret de l'endpoint
 * webhook (FEDAPAY_WEBHOOK_SECRET, différent de la clé API).
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }), // on a besoin du corps brut pour vérifier la signature
  async (req, res) => {
    const signatureHeader = req.headers['x-fedapay-signature'];
    const secret = process.env.FEDAPAY_WEBHOOK_SECRET;

    if (!signatureHeader || !secret) {
      console.warn('Webhook FedaPay reçu sans signature ou secret non configuré.');
      return res.status(400).json({ error: 'Signature manquante.' });
    }

    // Format du header : "t=<timestamp>,v1=<signature>" (comme Stripe).
    // Le message signé est "<timestamp>.<corps brut de la requête>".
    const parties = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const [cle, valeur] = p.split('=');
        return [cle, valeur];
      })
    );
    const timestamp = parties.t;
    const signatureRecue = parties.v1;

    if (!timestamp || !signatureRecue) {
      console.warn('Webhook FedaPay : en-tête de signature mal formé. Valeur brute reçue :', signatureHeader);
      return res.status(400).json({ error: 'Signature mal formée.' });
    }

    const messageSigne = `${timestamp}.${req.body.toString('utf8')}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(messageSigne).digest('hex');

    const signatureValide =
      signatureRecue.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signatureRecue), Buffer.from(expectedSignature));

    if (!signatureValide) {
      console.warn('Signature webhook FedaPay invalide — requête rejetée.');
      return res.status(401).json({ error: 'Signature invalide.' });
    }

    let event;
    try {
      event = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Corps JSON invalide.' });
    }

    // Structure d'événement à confirmer avec la doc FedaPay au moment du dev :
    // { name: 'transaction.approved', entity: { id, status, ... } }
    const eventName = event.name;
    const transactionId = String(event.entity?.id || '');

    if (!transactionId) {
      return res.status(400).json({ error: 'Événement sans transaction associée.' });
    }

    // Idempotence : on cherche d'abord un achat, puis un abonnement,
    // correspondant à cette transaction FedaPay — les deux flux de paiement
    // (QCM unitaire et abonnement mensuel) passent par ce même webhook.
    const { data: achat, error: findError } = await supabase
      .from('achat')
      .select('id, statut')
      .eq('reference_transaction', transactionId)
      .maybeSingle();

    if (findError) {
      console.error('Erreur Supabase (recherche achat webhook):', findError);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }

    if (achat) {
      if (achat.statut === 'confirme') {
        return res.status(200).json({ message: 'Déjà traité.' }); // idempotent
      }

      if (eventName === 'transaction.approved' || event.entity?.status === 'approved') {
        await supabase
          .from('achat')
          .update({ statut: 'confirme', confirmed_at: new Date().toISOString() })
          .eq('id', achat.id);
      } else if (
        eventName === 'transaction.declined' ||
        eventName === 'transaction.canceled' ||
        event.entity?.status === 'declined'
      ) {
        await supabase.from('achat').update({ statut: 'echoue' }).eq('id', achat.id);
      }

      return res.status(200).json({ received: true });
    }

    // Pas trouvé dans les achats unitaires : on regarde du côté des abonnements.
    const { data: abonnement, error: findAbonnementError } = await supabase
      .from('abonnement')
      .select('id, statut')
      .eq('reference_transaction', transactionId)
      .maybeSingle();

    if (findAbonnementError) {
      console.error('Erreur Supabase (recherche abonnement webhook):', findAbonnementError);
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
    if (!abonnement) {
      console.warn(`Webhook reçu pour une transaction inconnue: ${transactionId}`);
      return res.status(404).json({ error: 'Transaction introuvable.' });
    }
    if (abonnement.statut === 'actif') {
      return res.status(200).json({ message: 'Déjà traité.' }); // idempotent
    }

    if (eventName === 'transaction.approved' || event.entity?.status === 'approved') {
      const dateDebut = new Date();
      const dateFin = new Date(dateDebut.getTime() + DUREE_JOURS * 24 * 60 * 60 * 1000);
      await supabase
        .from('abonnement')
        .update({
          statut: 'actif',
          date_debut: dateDebut.toISOString(),
          date_fin: dateFin.toISOString(),
          code_abonnement: genererCodeAbonnement(),
        })
        .eq('id', abonnement.id);
    } else if (
      eventName === 'transaction.declined' ||
      eventName === 'transaction.canceled' ||
      event.entity?.status === 'declined'
    ) {
      await supabase.from('abonnement').update({ statut: 'echoue' }).eq('id', abonnement.id);
    }

    // FedaPay attend un 200 pour ne pas re-tenter indéfiniment
    res.status(200).json({ received: true });
  }
);

module.exports = router;
