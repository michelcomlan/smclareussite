const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../config/supabase');
const { fedapayClient } = require('../config/fedapay');

const MONTANT_ABONNEMENT = 3000; // FCFA
const DUREE_JOURS = 30;

function genererCodeAbonnement() {
  const suffixe = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SMC-${suffixe}`;
}

/**
 * POST /api/etudiant/abonnement/initier
 * body: { etudiant_id, telephone }
 *
 * Crée une ligne "abonnement" en attente, puis une transaction FedaPay.
 * Le montant (3000 FCFA) est fixé côté serveur, jamais envoyé par le client.
 */
router.post('/initier', async (req, res) => {
  const { etudiant_id, telephone } = req.body || {};

  if (!etudiant_id || !telephone) {
    return res.status(400).json({ error: 'etudiant_id et telephone sont requis.' });
  }

  const { data: etudiant, error: etudiantError } = await supabase
    .from('etudiant')
    .select('id, nom, prenom')
    .eq('id', etudiant_id)
    .maybeSingle();

  if (etudiantError) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!etudiant) return res.status(404).json({ error: 'Compte étudiant introuvable.' });

  const { data: abonnement, error: abonnementError } = await supabase
    .from('abonnement')
    .insert({
      etudiant_id,
      statut: 'en_attente',
      montant: MONTANT_ABONNEMENT,
    })
    .select()
    .single();

  if (abonnementError) {
    console.error('Erreur Supabase (création abonnement):', abonnementError);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  try {
    const { data: transaction } = await fedapayClient.post('/transactions', {
      description: `Abonnement mensuel SMC la Réussite — ${etudiant.prenom} ${etudiant.nom}`,
      amount: MONTANT_ABONNEMENT,
      currency: { iso: 'XOF' },
      callback_url: `${process.env.FRONTEND_URL}/abonnement/retour?abonnement_id=${abonnement.id}`,
      customer: {
        phone_number: { number: telephone, country: 'BJ' },
      },
    });

    const transactionId = transaction['v1/transaction'].id;

    await supabase
      .from('abonnement')
      .update({ reference_transaction: String(transactionId) })
      .eq('id', abonnement.id);

    const { data: tokenData } = await fedapayClient.post(
      `/transactions/${transactionId}/token`
    );

    res.status(201).json({
      abonnement_id: abonnement.id,
      paiement_url: tokenData['v1/transaction']?.payment_url || tokenData.url,
    });
  } catch (err) {
    console.error('Erreur FedaPay (initiation abonnement):', err.response?.data || err.message);
    await supabase.from('abonnement').update({ statut: 'echoue' }).eq('id', abonnement.id);
    res.status(502).json({ error: "Impossible d'initier le paiement pour le moment." });
  }
});

/**
 * GET /api/etudiant/abonnement/statut/:abonnement_id
 * Polling côté front pendant l'attente de confirmation.
 *
 * Filet de sécurité : si le webhook n'est pas encore arrivé (ou jamais
 * arrivé), on interroge directement l'API FedaPay pour connaître le vrai
 * statut de la transaction, et on active l'abonnement nous-mêmes le cas
 * échéant — sans dépendre uniquement du webhook.
 */
router.get('/statut/:abonnement_id', async (req, res) => {
  const { data, error } = await supabase
    .from('abonnement')
    .select('id, statut, code_abonnement, date_fin, reference_transaction')
    .eq('id', req.params.abonnement_id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!data) return res.status(404).json({ error: 'Abonnement introuvable.' });

  let abonnementActuel = data;

  if (abonnementActuel.statut === 'en_attente' && abonnementActuel.reference_transaction) {
    try {
      const { data: transactionData } = await fedapayClient.get(
        `/transactions/${abonnementActuel.reference_transaction}`
      );
      const statutFedaPay = transactionData['v1/transaction']?.status;

      if (statutFedaPay === 'approved') {
        const dateDebut = new Date();
        const dateFin = new Date(dateDebut.getTime() + DUREE_JOURS * 24 * 60 * 60 * 1000);
        const code = genererCodeAbonnement();

        const { data: misAJour } = await supabase
          .from('abonnement')
          .update({
            statut: 'actif',
            date_debut: dateDebut.toISOString(),
            date_fin: dateFin.toISOString(),
            code_abonnement: code,
          })
          .eq('id', abonnementActuel.id)
          .eq('statut', 'en_attente') // évite une double activation si le webhook arrive juste après
          .select()
          .maybeSingle();

        if (misAJour) abonnementActuel = misAJour;
      } else if (statutFedaPay === 'declined' || statutFedaPay === 'canceled') {
        await supabase.from('abonnement').update({ statut: 'echoue' }).eq('id', abonnementActuel.id);
        abonnementActuel = { ...abonnementActuel, statut: 'echoue' };
      }
    } catch (err) {
      // Si FedaPay ne répond pas, on retombe simplement sur l'attente du webhook
      console.warn('Vérification directe FedaPay impossible :', err.response?.data || err.message);
    }
  }

  res.json({
    statut: abonnementActuel.statut,
    code_abonnement: abonnementActuel.statut === 'actif' ? abonnementActuel.code_abonnement : undefined,
    date_fin: abonnementActuel.statut === 'actif' ? abonnementActuel.date_fin : undefined,
  });
});

/**
 * GET /api/etudiant/abonnement/actif/:etudiant_id
 * Renvoie l'abonnement actif en cours pour un étudiant, s'il y en a un
 * (date_fin dans le futur) — utilisé pour vérifier l'accès aux QCM complets.
 */
router.get('/actif/:etudiant_id', async (req, res) => {
  const { data, error } = await supabase
    .from('abonnement')
    .select('id, code_abonnement, date_fin')
    .eq('etudiant_id', req.params.etudiant_id)
    .eq('statut', 'actif')
    .gt('date_fin', new Date().toISOString())
    .order('date_fin', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json({ abonnement_actif: data || null });
});

module.exports = { router, MONTANT_ABONNEMENT, DUREE_JOURS, genererCodeAbonnement };
