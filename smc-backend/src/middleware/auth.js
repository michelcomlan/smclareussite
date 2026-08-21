const jwt = require('jsonwebtoken');

/**
 * Vérifie qu'une requête admin porte un JWT valide.
 * Le token est attendu dans le header : Authorization: Bearer <token>
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

/**
 * Vérifie qu'une requête porte un token "téléphone vérifié" (obtenu après
 * validation d'un code OTP via /api/otp/verifier). Attache le numéro
 * vérifié à req.telephoneVerifie — le body/query ne peut pas mentir dessus.
 */
function requireTelephoneVerifie(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Vérification du numéro requise.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'telephone_verifie') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    req.telephoneVerifie = payload.telephone;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Vérification expirée. Redemandez un code.' });
  }
}

module.exports = { requireAdmin, requireTelephoneVerifie };
