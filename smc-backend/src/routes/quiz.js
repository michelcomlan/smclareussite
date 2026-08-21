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
 * GET /api/quiz/:qcm_id?achat_id=...&token_acces=...
 * Renvoie les questions du QCM SANS les bonnes réponses.
 * Accès vérifié côté serveur via l'achat confirmé — jamais via le front seul.
 */
router.get('/:qcm_id', async (req, res) => {
  const { achat_id, token_acces } = req.query;
  const { qcm_id } = req.params;

  const achat = await getAchatValide(achat_id, token_acces);
  if (!achat || achat.qcm_id !== qcm_id) {
    return res.status(403).json({
      error: "Accès refusé. Ce QCM n'a pas été payé (ou le paiement n'est pas encore confirmé).",
    });
  }

  const { data: questions, error } = await supabase
    .from('question')
    .select('id, ordre, enonce, options') // PAS index_bonne_reponse
    .eq('qcm_id', qcm_id)
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  res.json({ qcm_id, questions });
});

/**
 * POST /api/quiz/:qcm_id/soumettre
 * body: { achat_id, token_acces, reponses: [{ question_id, index_choisi }] }
 *
 * Le score est calculé côté serveur à partir des bonnes réponses en base —
 * jamais fait confiance à un score envoyé par le client.
 */
router.post('/:qcm_id/soumettre', async (req, res) => {
  const { qcm_id } = req.params;
  const { achat_id, token_acces, reponses } = req.body || {};

  const achat = await getAchatValide(achat_id, token_acces);
  if (!achat || achat.qcm_id !== qcm_id) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }

  if (!Array.isArray(reponses) || reponses.length === 0) {
    return res.status(400).json({ error: 'Réponses manquantes ou invalides.' });
  }

  const { data: questions, error } = await supabase
    .from('question')
    .select('id, enonce, options, index_bonne_reponse')
    .eq('qcm_id', qcm_id);

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const bonneReponseParId = new Map(questions.map((q) => [q.id, q.index_bonne_reponse]));

  let score = 0;
  const detail = reponses.map((r) => {
    const bonneReponse = bonneReponseParId.get(r.question_id);
    const correct = bonneReponse !== undefined && bonneReponse === r.index_choisi;
    if (correct) score += 1;
    return {
      question_id: r.question_id,
      index_choisi: r.index_choisi,
      index_bonne_reponse: bonneReponse,
      correct,
    };
  });

  const { data: tentative, error: insertError } = await supabase
    .from('tentative_quiz')
    .insert({
      qcm_id,
      achat_id: achat.id,
      reponses: detail,
      score,
      score_sur: questions.length,
    })
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
