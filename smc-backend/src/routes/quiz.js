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
 * Renvoie les questions du QCM AVEC leur réponse rédigée.
 *
 * Contrairement à un QCM à choix multiples, envoyer la réponse dès le
 * chargement n'est pas un problème de sécurité ici : il n'y a rien à
 * "deviner". Le principe du mode fiches est que l'étudiant choisit
 * lui-même quand révéler la réponse (côté front), puis s'auto-évalue.
 * L'accès reste vérifié côté serveur via l'achat confirmé.
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
    .select('id, ordre, enonce, reponse, sous_categorie, difficulte, points, temps_limite')
    .eq('qcm_id', qcm_id)
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  res.json({ qcm_id, questions });
});

/**
 * POST /api/quiz/:qcm_id/soumettre
 * body: { achat_id, token_acces, reponses: [{ question_id, reussi: true|false }] }
 *
 * "reussi" est l'auto-évaluation de l'étudiant (pas de correction
 * automatique possible sur une réponse rédigée libre). Le score final
 * est le nombre de fiches marquées "réussi", calculé côté serveur à
 * partir de ce que le client envoie (il n'y a pas de "triche" possible
 * ici puisque l'étudiant s'auto-évalue de toute façon).
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
    .select('id, enonce, reponse')
    .eq('qcm_id', qcm_id);

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const questionParId = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  const detail = reponses
    .filter((r) => questionParId.has(r.question_id))
    .map((r) => {
      const reussi = !!r.reussi;
      if (reussi) score += 1;
      return { question_id: r.question_id, reussi };
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
