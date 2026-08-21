const axios = require('axios');

/**
 * Interface d'envoi de SMS.
 *
 * ⚠️ AUCUN fournisseur SMS n'est précisé dans le cahier des charges — ce
 * fichier fournit une interface générique à brancher sur le fournisseur
 * réellement choisi (ex. Twilio, Vonage, ou un fournisseur local béninois
 * type SMSVAS/AllOK). Voir la section "À faire" en bas de ce fichier.
 *
 * En attendant, si SMS_PROVIDER n'est pas configuré, le code est simplement
 * affiché dans les logs serveur (mode développement) — pratique pour tester
 * tout le flux OTP sans dépenser de crédits SMS.
 */

async function envoyerSms(telephone, message) {
  const provider = process.env.SMS_PROVIDER || 'console';

  if (provider === 'console') {
    console.log(`[SMS SIMULÉ] → ${telephone} : ${message}`);
    return { success: true, simulated: true };
  }

  if (provider === 'generic_http') {
    // Exemple générique pour un fournisseur exposant une API HTTP simple
    // du type POST { to, message } avec une clé API en Authorization.
    // À adapter avec les paramètres exacts du fournisseur choisi.
    await axios.post(
      process.env.SMS_API_URL,
      { to: telephone, message },
      { headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}` } }
    );
    return { success: true };
  }

  throw new Error(`Fournisseur SMS inconnu : "${provider}"`);
}

module.exports = { envoyerSms };

/**
 * À FAIRE avant mise en production :
 * 1. Choisir un fournisseur SMS opérant au Bénin (couverture MTN/Moov).
 * 2. Ouvrir un compte, récupérer les identifiants API.
 * 3. Adapter la fonction envoyerSms() ci-dessus à leur API exacte
 *    (endpoint, format de payload, authentification).
 * 4. Définir SMS_PROVIDER (autre que "console") + les variables associées
 *    dans .env.
 * 5. Tester l'envoi réel avec le numéro du porteur de projet avant
 *    d'ouvrir au public (comme prévu à l'étape 8 du cahier des charges
 *    pour le paiement — même logique de test avec son propre numéro).
 */
