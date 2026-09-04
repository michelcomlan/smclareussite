const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

/**
 * Vérifie qu'un achat existe, est confirmé, et correspond au token d'accès
 * fourni par le client (envoyé après confirmation de paiement).
 * Retourne l'achat ou null.
 */
async function getAchatValide(achat_id, token_acces) {
  if (!achat_id || !token_acces) return null;

  const { data: achat } = await supabase
    .from('achat')
    .select('id, qcm_id, statut, token_acces')
    .eq('id', achat_id)
    .maybeSingle();

  if (!achat) return null;
  if (achat.statut !== 'confirme') return null;
  if (achat.token_acces !== token_acces) return null;

  return achat;
}

/**
 * Vérifie qu'un étudiant a un abonnement actif (date_fin dans le futur).
 * Retourne l'étudiant ou null — l'accès par abonnement n'est pas limité
 * à un QCM particulier, contrairement à l'achat unitaire.
 */
async function getEtudiantAbonne(etudiant_id) {
  if (!etudiant_id) return null;

  const { data: abonnement } = await supabase
    .from('abonnement')
    .select('id, etudiant_id')
    .eq('etudiant_id', etudiant_id)
    .eq('statut', 'actif')
    .gt('date_fin', new Date().toISOString())
    .limit(1)
    .maybeSingle();

  return abonnement ? { etudiant_id } : null;
}

/**
 * Un accès est valide s'il vient soit d'un achat unitaire confirmé pour ce
 * QCM précis (ancien modèle), soit d'un abonnement étudiant actif (nouveau
 * modèle — accès à tous les QCM de la plateforme).
 */
async function verifierAcces({ achat_id, token_acces, etudiant_id, qcm_id }) {
  const achat = await getAchatValide(achat_id, token_acces);
  if (achat && achat.qcm_id === qcm_id) return { type: 'achat', achat_id: achat.id };

  const etudiant = await getEtudiantAbonne(etudiant_id);
  if (etudiant) return { type: 'abonnement', etudiant_id };

  return null;
}

/**
 * GET /api/quiz/:qcm_id?achat_id=...&token_acces=...
 * Renvoie les questions du QCM, adaptées à son mode :
 * - "fiche" : question + réponse rédigée (l'étudiant s'auto-évalue,
 *   révéler la réponse à l'avance n'est pas un problème de sécurité).
 * - "qcu" : question + choix A/B/C/D, SANS la bonne réponse — la
 *   correction se fait côté serveur à la soumission, pour empêcher
 *   toute triche en lisant le code source de la page.
 */
router.get('/:qcm_id', async (req, res) => {
  const { achat_id, token_acces, etudiant_id } = req.query;
  const { qcm_id } = req.params;

  const acces = await verifierAcces({ achat_id, token_acces, etudiant_id, qcm_id });
  if (!acces) {
    return res.status(403).json({
      error:
        "Accès refusé. Ce QCM n'a pas été payé, ou votre abonnement n'est pas (ou plus) actif.",
    });
  }

  const { data: qcm, error: qcmError } = await supabase
    .from('qcm')
    .select('id, titre, type_quiz')
    .eq('id', qcm_id)
    .maybeSingle();

  if (qcmError || !qcm) return res.status(404).json({ error: 'QCM introuvable.' });

  const colonnes =
    qcm.type_quiz === 'qcu'
      ? 'id, ordre, enonce, options' // jamais index_bonne_reponse ici
      : 'id, ordre, enonce, reponse, sous_categorie, difficulte, points, temps_limite';

  const { data: questions, error } = await supabase
    .from('question')
    .select(colonnes)
    .eq('qcm_id', qcm_id)
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  res.json({ qcm_id, type_quiz: qcm.type_quiz, questions });
});

/**
 * POST /api/quiz/:qcm_id/soumettre
 *
 * Mode "fiche" — body: { ..., reponses: [{ question_id, reussi }] }
 *   "reussi" est l'auto-évaluation de l'étudiant (réponse rédigée libre,
 *   pas de correction automatique possible).
 *
 * Mode "qcu" — body: { ..., reponses: [{ question_id, index_choisi }] }
 *   Le score est calculé côté serveur à partir des bonnes réponses en
 *   base — jamais fait confiance à un score envoyé par le client.
 */
router.post('/:qcm_id/soumettre', async (req, res) => {
  const { qcm_id } = req.params;
  const { achat_id, token_acces, etudiant_id, reponses } = req.body || {};

  const acces = await verifierAcces({ achat_id, token_acces, etudiant_id, qcm_id });
  if (!acces) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  if (!Array.isArray(reponses) || reponses.length === 0) {
    return res.status(400).json({ error: 'Réponses manquantes ou invalides.' });
  }

  const { data: qcm, error: qcmError } = await supabase
    .from('qcm')
    .select('id, type_quiz')
    .eq('id', qcm_id)
    .maybeSingle();

  if (qcmError || !qcm) return res.status(404).json({ error: 'QCM introuvable.' });

  const { data: questions, error } = await supabase
    .from('question')
    .select('id, enonce, reponse, index_bonne_reponse')
    .eq('qcm_id', qcm_id);

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const questionParId = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  let detail;

  if (qcm.type_quiz === 'qcu') {
    detail = reponses
      .filter((r) => questionParId.has(r.question_id))
      .map((r) => {
        const question = questionParId.get(r.question_id);
        const correct = question.index_bonne_reponse === r.index_choisi;
        if (correct) score += 1;
        return {
          question_id: r.question_id,
          index_choisi: r.index_choisi,
          index_bonne_reponse: question.index_bonne_reponse,
          correct,
        };
      });
  } else {
    detail = reponses
      .filter((r) => questionParId.has(r.question_id))
      .map((r) => {
        const reussi = !!r.reussi;
        if (reussi) score += 1;
        return { question_id: r.question_id, reussi };
      });
  }

  const ligneTentative = {
    qcm_id,
    reponses: detail,
    score,
    score_sur: questions.length,
  };
  if (acces.type === 'achat') ligneTentative.achat_id = acces.achat_id;
  if (acces.type === 'abonnement') ligneTentative.etudiant_id = acces.etudiant_id;

  const { data: tentative, error: insertError } = await supabase
    .from('tentative_quiz')
    .insert(ligneTentative)
    .select()
    .single();

  if (insertError) {
    console.error('Erreur Supabase (tentative_quiz):', insertError);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  res.status(201).json({
    score,
    score_sur: questions.length,
    detail,
    tentative_id: tentative.id,
  });
});

module.exports = router;
