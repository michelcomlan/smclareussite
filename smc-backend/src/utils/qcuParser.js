/**
 * Regroupe des paragraphes de texte (extraits d'un .docx via docxParser)
 * en questions à choix unique (QCU).
 *
 * Format attendu, une ligne par élément :
 *   Énoncé de la question ?
 *   -Mauvaise réponse
 *   -Mauvaise réponse
 *   *Bonne réponse
 *   -Mauvaise réponse
 *
 * Une ligne qui ne commence ni par "-" ni par "*" démarre une nouvelle
 * question. Les lignes suivantes commençant par "-" ou "*" sont ses
 * choix ; "*" marque la bonne réponse.
 */
function parseQuestionsQcu(paragraphes) {
  const questions = [];
  const errors = [];
  let courante = null;

  function cloturer() {
    if (!courante) return;
    const numero = questions.length + errors.length + 1;
    if (courante.options.length < 2) {
      errors.push(`Question ${numero} ("${courante.enonce.slice(0, 40)}...") : moins de 2 choix, ignorée.`);
    } else if (courante.indexBonneReponse === null) {
      errors.push(`Question ${numero} ("${courante.enonce.slice(0, 40)}...") : aucune bonne réponse marquée (*), ignorée.`);
    } else {
      questions.push({
        ordre: questions.length,
        enonce: courante.enonce,
        options: courante.options,
        indexBonneReponse: courante.indexBonneReponse,
      });
    }
  }

  for (const ligneBrute of paragraphes) {
    const ligne = (ligneBrute || '').trim();
    if (!ligne) continue;

    const estOption = ligne.startsWith('-') || ligne.startsWith('*');

    if (!estOption) {
      cloturer();
      courante = { enonce: ligne, options: [], indexBonneReponse: null };
      continue;
    }

    if (!courante) {
      errors.push(`Ligne "${ligne.slice(0, 40)}..." : choix trouvé sans question précédente, ignorée.`);
      continue;
    }

    const estCorrecte = ligne.startsWith('*');
    const texte = ligne
      .slice(1)
      .trim()
      .replace(/\t+$/, '')
      .trim();

    if (estCorrecte) courante.indexBonneReponse = courante.options.length;
    courante.options.push(texte);
  }
  cloturer();

  return { questions, errors };
}

module.exports = { parseQuestionsQcu };
