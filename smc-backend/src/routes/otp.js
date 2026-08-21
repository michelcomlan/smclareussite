const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const supabase = require('../config/supabase');
const { envoyerSms } = require('../utils/smsSender');

const router = express.Router();

const CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 10;
const MAX_TENTATIVES = 5;
const TOKEN_VERIFICATION_EXPIRATION = '15m';

function genererCode() {
  // Code à 6 chiffres, généré de façon cryptographiquement sûre.
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(CODE_LENGTH, '0');
}

// Anti-spam : max 3 demandes de code / 10 min / numéro (évite qu'on inonde
// un numéro de SMS, et limite les coûts d'envoi).
const demandeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.telephone || req.ip,
  message: { error: 'Trop de demandes de code pour ce numéro. Réessayez dans quelques minutes.' },
});

// Anti-bruteforce sur la vérification elle-même (en plus du compteur en base)
const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.body?.telephone || req.ip,
  message: { error: 'Trop de tentatives. Réessayez plus tard.' },
});

/**
 * POST /api/otp/demander
 * body: { telephone }
 * Génère un code à 6 chiffres, l'enregistre (hashé) et l'envoie par SMS.
 */
router.post('/demander', demandeLimiter, async (req, res) => {
  const { telephone } = req.body || {};

  if (!telephone || typeof telephone !== 'string' || telephone.trim().length < 8) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  }

  const code = genererCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from('otp_verification').insert({
    telephone,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Erreur Supabase (création OTP):', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  try {
    await envoyerSms(
      telephone,
      `SMC la Réussite : votre code de vérification est ${code}. Il expire dans ${CODE_EXPIRATION_MINUTES} minutes.`
    );
  } catch (err) {
    console.error('Erreur envoi SMS:', err.message);
    return res.status(502).json({ error: "Impossible d'envoyer le SMS pour le moment." });
  }

  // Réponse volontairement neutre — on ne révèle jamais si un achat existe
  // pour ce numéro à ce stade.
  res.json({ message: 'Code envoyé par SMS.', expire_dans_minutes: CODE_EXPIRATION_MINUTES });
});

/**
 * POST /api/otp/verifier
 * body: { telephone, code }
 * Vérifie le code le plus récent pour ce numéro. Si valide, renvoie un
 * token temporaire (15 min) prouvant que ce numéro est vérifié — ce token
 * est requis pour appeler /api/payment/retrouver.
 */
router.post('/verifier', verificationLimiter, async (req, res) => {
  const { telephone, code } = req.body || {};

  if (!telephone || !code) {
    return res.status(400).json({ error: 'telephone et code sont requis.' });
  }

  const { data: otp, error } = await supabase
    .from('otp_verification')
    .select('id, code_hash, tentatives, utilise, expires_at')
    .eq('telephone', telephone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Erreur serveur.' });

  const codeInvalideGenerique = { error: 'Code invalide ou expiré.' };

  if (!otp) return res.status(400).json(codeInvalideGenerique);
  if (otp.utilise) return res.status(400).json(codeInvalideGenerique);
  if (new Date(otp.expires_at) < new Date()) return res.status(400).json(codeInvalideGenerique);
  if (otp.tentatives >= MAX_TENTATIVES) {
    return res.status(429).json({ error: 'Trop de tentatives pour ce code. Demandez-en un nouveau.' });
  }

  const codeValide = await bcrypt.compare(code, otp.code_hash);

  if (!codeValide) {
    await supabase
      .from('otp_verification')
      .update({ tentatives: otp.tentatives + 1 })
      .eq('id', otp.id);
    return res.status(400).json(codeInvalideGenerique);
  }

  // Code valide : on le marque comme utilisé pour empêcher toute réutilisation.
  await supabase.from('otp_verification').update({ utilise: true }).eq('id', otp.id);

  const token = jwt.sign(
    { telephone, role: 'telephone_verifie' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_VERIFICATION_EXPIRATION }
  );

  res.json({ token, expire_dans: TOKEN_VERIFICATION_EXPIRATION });
});

module.exports = router;
