const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAdmin } = require('../middleware/auth');

/**
 * Vérifie qu'un étudiant a un abonnement actif — même logique que pour
 * l'accès aux QCM. Les cours sont réservés aux abonnés.
 */
async function aUnAbonnementActif(etudiant_id) {
  if (!etudiant_id) return false;
  const { data } = await supabase
    .from('abonnement')
    .select('id')
    .eq('etudiant_id', etudiant_id)
    .eq('statut', 'actif')
    .gt('date_fin', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * GET /api/cours?etudiant_id=...
 * Renvoie les cours publiés de la filière de l'étudiant, groupés par
 * chapitre. Nécessite un abonnement actif (comme les QCM).
 */
router.get('/', async (req, res) => {
  const { etudiant_id } = req.query;

  if (!(await aUnAbonnementActif(etudiant_id))) {
    return res.status(403).json({ error: 'Abonnement actif requis.' });
  }

  const { data: etudiant, error: etudiantError } = await supabase
    .from('etudiant')
    .select('filiere_id')
    .eq('id', etudiant_id)
    .maybeSingle();

  if (etudiantError || !etudiant) {
    return res.status(404).json({ error: 'Compte étudiant introuvable.' });
  }

  const { data: cours, error } = await supabase
    .from('cours')
    .select('id, chapitre, titre, type, ordre')
    .eq('filiere_id', etudiant.filiere_id)
    .eq('publie', true)
    .order('chapitre')
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  res.json(cours);
});

/**
 * GET /api/cours/:id?etudiant_id=...
 * Détail d'un cours (avec son URL) — nécessite toujours un abonnement
 * actif, vérifié à chaque consultation (pas seulement à la liste).
 */
router.get('/:id', async (req, res) => {
  const { etudiant_id } = req.query;

  if (!(await aUnAbonnementActif(etudiant_id))) {
    return res.status(403).json({ error: 'Abonnement actif requis.' });
  }

  const { data: cours, error } = await supabase
    .from('cours')
    .select('id, chapitre, titre, type, url, publie')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  if (!cours || !cours.publie) return res.status(404).json({ error: 'Cours introuvable.' });

  res.json(cours);
});

/**
 * ---- Routes admin ----
 */

/** GET /api/cours/admin/liste — tous les cours, publiés ou non */
router.get('/admin/liste', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('cours')
    .select('id, filiere_id, matiere_id, chapitre, titre, type, url, ordre, publie')
    .order('chapitre')
    .order('ordre');

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json(data);
});

/** POST /api/cours/admin — créer un cours */
router.post('/admin', requireAdmin, async (req, res) => {
  const { filiere_id, matiere_id, chapitre, titre, type, url, ordre, publie } = req.body || {};

  if (!filiere_id || !chapitre?.trim() || !titre?.trim() || !type || !url?.trim()) {
    return res.status(400).json({ error: 'Filière, chapitre, titre, type et lien sont requis.' });
  }
  if (!['document', 'video'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide (document ou video).' });
  }

  const { data, error } = await supabase
    .from('cours')
    .insert({
      filiere_id,
      matiere_id: matiere_id || null,
      chapitre: chapitre.trim(),
      titre: titre.trim(),
      type,
      url: url.trim(),
      ordre: Number.isFinite(ordre) ? ordre : 0,
      publie: !!publie,
    })
    .select()
    .single();

  if (error) {
    console.error('Erreur Supabase (création cours):', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  res.status(201).json(data);
});

/** PATCH /api/cours/admin/:id/publier — bascule publié/dépublié */
router.patch('/admin/:id/publier', requireAdmin, async (req, res) => {
  const { data: existant, error: findError } = await supabase
    .from('cours')
    .select('publie')
    .eq('id', req.params.id)
    .maybeSingle();

  if (findError || !existant) return res.status(404).json({ error: 'Cours introuvable.' });

  const { error } = await supabase
    .from('cours')
    .update({ publie: !existant.publie })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.json({ publie: !existant.publie });
});

/** DELETE /api/cours/admin/:id */
router.delete('/admin/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('cours').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Erreur serveur.' });
  res.status(204).end();
});

module.exports = router;
