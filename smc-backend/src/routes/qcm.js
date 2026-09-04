const express = require('express');
const multer = require('multer');
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');
const { parseQcmJson } = require('../utils/qcmParser');
const { extraireParagraphes } = require('../utils/docxParser');
const { parseQuestionsQcu } = require('../utils/qcuParser');

const router = express.Router();
const uploadMemoire = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================
// ROUTES PUBLIQUES (catalogue étudiant)
// ============================================================

/**
 * GET /api/qcm?niveau=Licence&filiere_id=...&matiere_id=...
 * Liste les QCM publiés, avec filtres combinables.
 * Ne renvoie JAMAIS les questions ni les bonnes réponses.
 */
router.get('/', async (req, res) => {
  const { niveau, filiere_id, matiere_id } = req.query;

  let query = supabase
    .from('qcm')
    .select('id, titre, niveau, filiere_id, matiere_id, nombre_questions, prix, type_quiz, created_at')
    .eq('publie', true)
    .order('created_at', { ascending: false });

  if (niveau) query = query.eq('niveau', niveau);
  if (filiere_id) query = query.eq('filiere_id', filiere_id);
  if (matiere_id) query = query.eq('matiere_id', matiere_id);

  const { data, error } = await query;
  if (error) {
    console.error('Erreur Supabase (liste qcm):', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
  res.json(data);
});

/** GET /api/qcm/filieres — liste des filières pour les filtres */
router.get('/filieres', async (_req, res) => {
  const { data, error } = await supabase.from('filiere').select('id, nom').order('nom');
  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/** GET /api/qcm/matieres — liste des matières pour les filtres */
router.get('/matieres', async (_req, res) => {
  const { data, error } = await supabase.from('matiere').select('id, nom').order('nom');
  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/**
 * GET /api/qcm/:id
 * Détail d'un QCM publié (fiche produit) — sans les questions.
 */
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('qcm')
    .select('id, titre, niveau, filiere_id, matiere_id, nombre_questions, prix, type_quiz, created_at')
    .eq('id', req.params.id)
    .eq('publie', true)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!data) return res.status(404).json({ error: 'QCM introuvable.' });
  res.json(data);
});

// ============================================================
// ROUTES ADMIN (protégées par JWT)
// ============================================================

/** GET /api/qcm/admin/all — liste complète (publiés + non publiés) */
router.get('/admin/all', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('qcm')
    .select('id, titre, niveau, filiere_id, matiere_id, nombre_questions, prix, publie, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/**
 * POST /api/qcm/admin/preview-import
 * body: { texte } — texte = contenu brut du fichier .json importé
 * Parse le JSON SANS rien enregistrer — pour l'aperçu avant publication.
 * Renvoie aussi domaineDetecte pour présélectionner la matière côté admin.
 */
router.post('/admin/preview-import', requireAdmin, async (req, res) => {
  const { texte } = req.body || {};
  const result = parseQcmJson(texte);

  // Si un domaine a été détecté, on tente de retrouver la matière correspondante
  let matiereSuggeree = null;
  if (result.domaineDetecte) {
    const { data } = await supabase
      .from('matiere')
      .select('id, nom')
      .ilike('nom', result.domaineDetecte)
      .maybeSingle();
    if (data) matiereSuggeree = data;
  }

  res.json({ ...result, matiereSuggeree });
});

/**
 * POST /api/qcm/admin
 * body: { titre, niveau, filiere_id, matiere_id, prix, texte, publie }
 * texte = contenu brut du fichier .json importé (tableau de questions).
 * Crée le QCM + ses questions (format "fiche de révision").
 */
router.post('/admin', requireAdmin, async (req, res) => {
  const { titre, niveau, filiere_id, matiere_id, prix, texte, publie } = req.body || {};

  if (!titre || !niveau || prix === undefined || !texte) {
    return res.status(400).json({ error: 'Champs requis manquants (titre, niveau, prix, fichier).' });
  }
  if (!['Licence', 'Master'].includes(niveau)) {
    return res.status(400).json({ error: 'Niveau invalide.' });
  }

  const { questions, errors } = parseQcmJson(texte);
  if (questions.length === 0) {
    return res.status(400).json({ error: 'Aucune question valide détectée.', details: errors });
  }

  // 1. Créer le QCM
  const { data: qcm, error: qcmError } = await supabase
    .from('qcm')
    .insert({
      titre,
      niveau,
      filiere_id: filiere_id || null,
      matiere_id: matiere_id || null,
      prix,
      nombre_questions: questions.length,
      publie: !!publie,
    })
    .select()
    .single();

  if (qcmError) {
    console.error('Erreur Supabase (création qcm):', qcmError);
    return res.status(500).json({ error: 'Erreur serveur lors de la création du QCM.' });
  }

  // 2. Insérer les questions liées (format fiche : une réponse rédigée par question)
  const rows = questions.map((q) => ({
    qcm_id: qcm.id,
    ordre: q.ordre,
    enonce: q.enonce,
    reponse: q.reponse,
    sous_categorie: q.sousCategorie,
    difficulte: q.difficulte,
    points: q.points,
    temps_limite: q.tempsLimite,
  }));

  const { error: questionsError } = await supabase.from('question').insert(rows);

  if (questionsError) {
    console.error('Erreur Supabase (création questions):', questionsError);
    // Rollback manuel : on supprime le QCM créé pour ne pas laisser un QCM vide
    await supabase.from('qcm').delete().eq('id', qcm.id);
    return res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement des questions.' });
  }

  res.status(201).json({ qcm, questionsImportees: questions.length, avertissements: errors });
});

// ============================================================
// Format QCU (choix unique, A/B/C/D) — import depuis un fichier Word
// ============================================================

/**
 * POST /api/qcm/admin/preview-import-qcu
 * multipart/form-data, champ "fichier" = un .docx
 * Parse SANS rien enregistrer — pour l'aperçu avant publication.
 */
router.post('/admin/preview-import-qcu', requireAdmin, uploadMemoire.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant.' });

  try {
    const paragraphes = extraireParagraphes(req.file.buffer);
    const result = parseQuestionsQcu(paragraphes);
    res.json(result);
  } catch (err) {
    console.error('Erreur lecture .docx (aperçu QCU):', err);
    res.status(400).json({ error: "Impossible de lire ce fichier .docx. Vérifiez qu'il n'est pas corrompu." });
  }
});

/**
 * POST /api/qcm/admin/qcu
 * multipart/form-data : fichier (.docx) + titre, niveau, filiere_id,
 * matiere_id, prix, publie (champs texte classiques du formulaire).
 * Crée un QCM en mode "qcu" (choix unique, correction automatique).
 */
router.post('/admin/qcu', requireAdmin, uploadMemoire.single('fichier'), async (req, res) => {
  const { titre, niveau, filiere_id, matiere_id, prix, publie } = req.body || {};

  if (!req.file) return res.status(400).json({ error: 'Fichier manquant.' });
  if (!titre || !niveau || prix === undefined) {
    return res.status(400).json({ error: 'Champs requis manquants (titre, niveau, prix, fichier).' });
  }
  if (!['Licence', 'Master'].includes(niveau)) {
    return res.status(400).json({ error: 'Niveau invalide.' });
  }

  let questions, errors;
  try {
    const paragraphes = extraireParagraphes(req.file.buffer);
    ({ questions, errors } = parseQuestionsQcu(paragraphes));
  } catch (err) {
    console.error('Erreur lecture .docx (création QCU):', err);
    return res.status(400).json({ error: "Impossible de lire ce fichier .docx." });
  }

  if (questions.length === 0) {
    return res.status(400).json({ error: 'Aucune question valide détectée.', details: errors });
  }

  const { data: qcm, error: qcmError } = await supabase
    .from('qcm')
    .insert({
      titre,
      niveau,
      filiere_id: filiere_id || null,
      matiere_id: matiere_id || null,
      prix: Number(prix),
      nombre_questions: questions.length,
      publie: publie === 'true' || publie === true,
      type_quiz: 'qcu',
    })
    .select()
    .single();

  if (qcmError) {
    console.error('Erreur Supabase (création qcm qcu):', qcmError);
    return res.status(500).json({ error: 'Erreur serveur lors de la création du QCM.' });
  }

  const rows = questions.map((q) => ({
    qcm_id: qcm.id,
    ordre: q.ordre,
    enonce: q.enonce,
    options: q.options,
    index_bonne_reponse: q.indexBonneReponse,
  }));

  const { error: questionsError } = await supabase.from('question').insert(rows);

  if (questionsError) {
    console.error('Erreur Supabase (création questions qcu):', questionsError);
    await supabase.from('qcm').delete().eq('id', qcm.id);
    return res.status(500).json({ error: "Erreur serveur lors de l'enregistrement des questions." });
  }

  res.status(201).json({ qcm, questionsImportees: questions.length, avertissements: errors });
});

/**
 * PATCH /api/qcm/admin/:id
 * Édition des métadonnées (titre, prix, publication...). Ne touche pas aux questions.
 */
router.patch('/admin/:id', requireAdmin, async (req, res) => {
  const allowedFields = ['titre', 'niveau', 'filiere_id', 'matiere_id', 'prix', 'publie'];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
  }

  const { data, error } = await supabase
    .from('qcm')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!data) return res.status(404).json({ error: 'QCM introuvable.' });
  res.json(data);
});

/** DELETE /api/qcm/admin/:id */
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('qcm').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.status(204).send();
});

/** GET /api/qcm/admin/:id/questions — pour l'édition admin (avec bonnes réponses) */
router.get('/admin/:id/questions', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('question')
    .select('*')
    .eq('qcm_id', req.params.id)
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/** GET /api/qcm/admin/dashboard — nombre de ventes + revenu total */
router.get('/admin/stats/dashboard', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('achat')
    .select('montant, statut')
    .eq('statut', 'confirme');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const nombreVentes = data.length;
  const revenuTotal = data.reduce((sum, a) => sum + a.montant, 0);

  res.json({ nombreVentes, revenuTotal });
});

module.exports = router;
