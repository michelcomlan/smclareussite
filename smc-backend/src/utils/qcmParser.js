/**
 * Parseur du format RÉEL d'export QCMmaker (vérifié sur un fichier réel).
 *
 * Format : un fichier .json contenant un tableau d'objets, chacun avec au
 * minimum "text" (la question) et "answer" (la réponse rédigée) :
 *
 * [
 *   {
 *     "text": "Qu'est-ce que l'environnement de l'entreprise ?",
 *     "answer": "L'environnement de l'entreprise est l'ensemble des éléments...",
 *     "domain": "Management des organisations",
 *     "subCategory": "Environnement de l'entreprise",
 *     "difficulty": "Facile",
 *     "points": 10,
 *     "timeLimit": 50
 *   },
 *   ...
 * ]
 *
 * Il ne s'agit PAS de choix multiples : chaque question a une seule réponse
 * rédigée. Le site fonctionne en mode "fiches de révision" (l'étudiant lit
 * la question, essaie de répondre, révèle la réponse, puis s'auto-évalue).
 */

/**
 * @param {string} rawJson - Contenu brut du fichier .json importé par l'admin.
 * @returns {{ questions: Array, errors: Array, domaineDetecte: string|null }}
 *   questions: [{ ordre, enonce, reponse, sousCategorie, difficulte, points, tempsLimite }]
 *   errors: liste de messages décrivant les entrées qui n'ont pas pu être
 *           utilisées (pour affichage dans l'aperçu admin).
 *   domaineDetecte: la valeur "domain" la plus fréquente parmi les questions
 *           valides (utile pour présélectionner la matière côté admin), ou
 *           null si aucune n'est cohérente.
 */
function parseQcmJson(rawJson) {
  if (!rawJson || typeof rawJson !== 'string') {
    return { questions: [], errors: ['Fichier vide ou invalide.'], domaineDetecte: null };
  }

  let data;
  try {
    data = JSON.parse(rawJson);
  } catch (e) {
    return {
      questions: [],
      errors: [`Le fichier n'est pas un JSON valide (${e.message}).`],
      domaineDetecte: null,
    };
  }

  if (!Array.isArray(data)) {
    return {
      questions: [],
      errors: ['Le fichier doit contenir un tableau de questions ([...]).'],
      domaineDetecte: null,
    };
  }

  const questions = [];
  const errors = [];
  const domaineCompte = new Map();

  data.forEach((item, i) => {
    const numero = i + 1;
    if (!item || typeof item !== 'object') {
      errors.push(`Entrée ${numero} : format invalide, ignorée.`);
      return;
    }

    const enonce = typeof item.text === 'string' ? item.text.trim() : '';
    const reponse = typeof item.answer === 'string' ? item.answer.trim() : '';

    if (!enonce) {
      errors.push(`Entrée ${numero} : champ "text" manquant ou vide, ignorée.`);
      return;
    }
    if (!reponse) {
      errors.push(`Entrée ${numero} : champ "answer" manquant ou vide, ignorée.`);
      return;
    }

    const domain = typeof item.domain === 'string' && item.domain.trim() ? item.domain.trim() : null;
    if (domain) {
      domaineCompte.set(domain, (domaineCompte.get(domain) || 0) + 1);
    }

    questions.push({
      ordre: questions.length,
      enonce,
      reponse,
      domain,
      sousCategorie: typeof item.subCategory === 'string' ? item.subCategory.trim() || null : null,
      difficulte: typeof item.difficulty === 'string' ? item.difficulty.trim() || null : null,
      points: Number.isFinite(item.points) ? item.points : null,
      tempsLimite: Number.isFinite(item.timeLimit) ? item.timeLimit : null,
    });
  });

  if (questions.length === 0 && errors.length === 0) {
    errors.push('Aucune question valide détectée dans le fichier.');
  }

  let domaineDetecte = null;
  let max = 0;
  for (const [domain, count] of domaineCompte) {
    if (count > max) {
      max = count;
      domaineDetecte = domain;
    }
  }

  return { questions, errors, domaineDetecte };
}

module.exports = { parseQcmJson };
