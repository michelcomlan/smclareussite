const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * POST /api/etudiant/reconnexion
 * body: { telephone }
 * Retrouve un compte étudiant existant à partir de son numéro de téléphone
 * (utile si l'étudiant change de navigateur/appareil, ou l'a effacé).
 * Pas de mot de passe — cohérent avec l'inscription gratuite sans friction.
 */
router.post('/reconnexion', async (req, res) => {
  const { telephone } = req.body || {};

  if (!telephone?.trim()) {
    return res.status(400).json({ error: 'Numéro de téléphone requis.' });
  }

  const { data: etudiants, error } = await supabase
    .from('etudiant')
    .select('id, nom, prenom, filiere_id, telephone')
    .eq('telephone', telephone.trim())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!etudiants || etudiants.length === 0) {
    return res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro.' });
  }

  // Si plusieurs comptes existent avec ce numéro (ex : plusieurs inscriptions
  // par erreur), on privilégie celui qui a un abonnement actif — pas
  // simplement le compte le plus récemment créé, qui pourrait être vide.
  for (const candidat of etudiants) {
    const { data: abonnementActif } = await supabase
      .from('abonnement')
      .select('id')
      .eq('etudiant_id', candidat.id)
      .eq('statut', 'actif')
      .gt('date_fin', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (abonnementActif) {
      return res.json({ etudiant: candidat });
    }
  }

  // Aucun des comptes n'a d'abonnement actif : on renvoie le plus récent
  // (comportement précédent, raisonnable par défaut).
  res.json({ etudiant: etudiants[0] });
});

const { requireAdmin } = require('../middleware/auth');

/**
 * GET /api/etudiant/admin/par-code?code=SMC-XXXXXXXX
 * Retrouve l'étudiant propriétaire d'un code d'abonnement précis — utile
 * pour le support quand plusieurs comptes existent avec le même numéro.
 */
router.get('/admin/par-code', requireAdmin, async (req, res) => {
  const { code } = req.query;
  if (!code?.trim()) return res.status(400).json({ error: 'Code requis.' });

  const { data: abonnement, error } = await supabase
    .from('abonnement')
    .select('id, etudiant_id, statut, date_fin, code_abonnement')
    .eq('code_abonnement', code.trim())
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!abonnement) return res.status(404).json({ error: 'Code introuvable.' });

  const { data: etudiant } = await supabase
    .from('etudiant')
    .select('id, nom, prenom, telephone, filiere_id, created_at')
    .eq('id', abonnement.etudiant_id)
    .maybeSingle();

  res.json({ etudiant, abonnement });
});

/**
 * GET /api/etudiant/admin/recherche?telephone=...
 * Recherche un étudiant par téléphone, avec son abonnement le plus récent —
 * utile pour le support (ex : plusieurs comptes créés avec le même numéro).
 */
router.get('/admin/recherche', requireAdmin, async (req, res) => {
  const { telephone } = req.query;
  if (!telephone?.trim()) {
    return res.status(400).json({ error: 'Numéro de téléphone requis.' });
  }

  const { data: etudiants, error } = await supabase
    .from('etudiant')
    .select('id, nom, prenom, telephone, filiere_id, created_at')
    .eq('telephone', telephone.trim())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const resultats = await Promise.all(
    (etudiants || []).map(async (etudiant) => {
      const { data: abonnements } = await supabase
        .from('abonnement')
        .select('id, statut, date_debut, date_fin, code_abonnement')
        .eq('etudiant_id', etudiant.id)
        .order('created_at', { ascending: false });
      return { ...etudiant, abonnements: abonnements || [] };
    })
  );

  res.json(resultats);
});

/**
 * POST /api/etudiant/inscription
 * body: { nom, prenom, filiere_id, telephone }
 * Inscription gratuite, sans mot de passe. Renvoie l'étudiant créé —
 * le front-end garde son id en local pour le retrouver plus tard.
 */
router.post('/inscription', async (req, res) => {
  const { nom, prenom, filiere_id, telephone } = req.body || {};

  if (!nom?.trim() || !prenom?.trim() || !filiere_id) {
    return res.status(400).json({ error: 'Nom, prénom et filière sont requis.' });
  }

  const { data: etudiant, error } = await supabase
    .from('etudiant')
    .insert({
      nom: nom.trim(),
      prenom: prenom.trim(),
      filiere_id,
      telephone: telephone?.trim() || null,
    })
    .select('id, nom, prenom, filiere_id, telephone')
    .single();

  if (error) {
    console.error('Erreur Supabase (inscription étudiant):', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
  }

  res.status(201).json({ etudiant });
});

/**
 * GET /api/etudiant/:id
 * Retrouver un compte étudiant déjà créé (ex. après avoir fermé le
 * navigateur) — utile pour resynchroniser l'état "Mon compte" côté front.
 */
router.get('/:id', async (req, res) => {
  const { data: etudiant, error } = await supabase
    .from('etudiant')
    .select('id, nom, prenom, filiere_id, telephone')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!etudiant) return res.status(404).json({ error: 'Compte introuvable.' });

  res.json({ etudiant });
});

const NOMBRE_QUESTIONS_APERCU = 50;

/**
 * GET /api/etudiant/apercu-gratuit/questions
 * Aucune inscription requise. Renvoie jusqu'à 20 questions de la matière
 * "Management des organisations", prises sur le QCM publié en mode "qcu"
 * (choix unique) si disponible, sinon sur un QCM en mode "fiche" — pour
 * donner un vrai avant-goût de l'épreuve avant de s'abonner. Comme c'est
 * gratuit et sans enjeu, on peut envoyer directement les bonnes réponses
 * (pas besoin de correction sécurisée côté serveur ici).
 */
router.get('/apercu-gratuit/questions', async (_req, res) => {
  const { data: matiere, error: matiereError } = await supabase
    .from('matiere')
    .select('id, nom')
    .ilike('nom', 'Management%')
    .maybeSingle();

  if (matiereError || !matiere) {
    return res.status(404).json({ error: 'Matière "Management" introuvable.' });
  }

  // On privilégie un QCM en mode "qcu" (épreuve à choix unique), plus
  // représentatif d'un vrai examen ; à défaut, on retombe sur le mode fiche.
  let { data: qcm } = await supabase
    .from('qcm')
    .select('id, titre, type_quiz')
    .eq('matiere_id', matiere.id)
    .eq('publie', true)
    .eq('type_quiz', 'qcu')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!qcm) {
    const { data: qcmFiche } = await supabase
      .from('qcm')
      .select('id, titre, type_quiz')
      .eq('matiere_id', matiere.id)
      .eq('publie', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    qcm = qcmFiche;
  }

  if (!qcm) {
    return res.status(404).json({ error: 'Aucun QCM publié pour la matière "Management" pour le moment.' });
  }

  const colonnes =
    qcm.type_quiz === 'qcu'
      ? 'id, ordre, enonce, options, index_bonne_reponse'
      : 'id, ordre, enonce, reponse, difficulte';

  const { data: questions, error: questionsError } = await supabase
    .from('question')
    .select(colonnes)
    .eq('qcm_id', qcm.id)
    .order('ordre')
    .limit(NOMBRE_QUESTIONS_APERCU);

  if (questionsError) return res.status(500).json({ error: 'Erreur serveur.' });

  res.json({ qcm_titre: qcm.titre, type_quiz: qcm.type_quiz, questions });
});

module.exports = router;
