const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const supabase = require('../config/supabase');

const router = express.Router();

// Anti-bruteforce : max 50 tentatives de connexion / 15 min / IP
// (assoupli pour faciliter les tests — reste une protection de base)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
});

/**
 * POST /api/auth/login
 * body: { identifiant, motDePasse }
 */
router.post('/login', loginLimiter, async (req, res) => {
  const { identifiant, motDePasse } = req.body || {};

  if (!identifiant || !motDePasse) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const { data: admin, error } = await supabase
    .from('admin')
    .select('id, identifiant, mot_de_passe_hash')
    .eq('identifiant', identifiant)
    .maybeSingle();

  if (error) {
    console.error('Erreur Supabase (login):', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  // Réponse volontairement identique que l'identifiant existe ou non,
  // pour ne pas révéler quels identifiants existent en base.
  const genericError = { error: 'Identifiant ou mot de passe incorrect.' };

  if (!admin) return res.status(401).json(genericError);

  const passwordOk = await bcrypt.compare(motDePasse, admin.mot_de_passe_hash);
  if (!passwordOk) return res.status(401).json(genericError);

  const token = jwt.sign(
    { sub: admin.id, identifiant: admin.identifiant, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

  res.json({ token });
});

module.exports = router;
