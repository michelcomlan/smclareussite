/**
 * Parseur de texte structuré au format supposé d'export QCMmaker.
 *
 * ⚠️ IMPORTANT : ce parseur est basé sur le format DÉCRIT dans le cahier
 * des charges (Q: ... / A) B) C) D) ... / étoile = bonne réponse), qui est
 * une hypothèse. Avant de mettre ce parseur en production, il FAUT le
 * confronter à un vrai fichier exporté par QCMmaker et l'ajuster en
 * conséquence (voir README.md, section "Point de vigilance import QCM").
 *
 * Format attendu, exemple :
 *
 * Q: Quelle est la capitale du Bénin ?
 * A) Cotonou
 * B) Porto-Novo *
 * C) Parakou
 * D) Abomey
 *
 * Q: 2 + 2 = ?
 * A) 3
 * B) 4 *
 * C) 5
 * D) 6
 *
 * La bonne réponse est repérée par une étoile "*" en fin (ou début) de ligne.
 */

const QUESTION_PREFIX = /^Q\s*:\s*/i;
const OPTION_LINE = /^([A-Z])\s*[)\.]\s*(.+)$/;

/**
 * @param {string} rawText - Texte brut collé/importé par l'admin.
 * @returns {{ questions: Array, errors: Array }}
 *   questions: [{ enonce, options: string[], indexBonneReponse: number }]
 *   errors: liste de messages décrivant les blocs qui n'ont pas pu être
 *           parsés correctement (pour affichage dans l'aperçu admin).
 */
function parseQcmText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { questions: [], errors: ['Texte vide ou invalide.'] };
  }

  // Découpage en blocs : chaque bloc commence par une ligne "Q:"
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');

  const blocks = [];
  let currentBlock = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (QUESTION_PREFIX.test(trimmed)) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { questionLine: trimmed.replace(QUESTION_PREFIX, ''), optionLines: [] };
    } else if (currentBlock) {
      currentBlock.optionLines.push(trimmed);
    }
    // Les lignes avant la première "Q:" sont ignorées.
  }
  if (currentBlock) blocks.push(currentBlock);

  const questions = [];
  const errors = [];

  blocks.forEach((block, blockIndex) => {
    const questionNumber = blockIndex + 1;
    const enonce = block.questionLine.trim();

    if (!enonce) {
      errors.push(`Question ${questionNumber} : énoncé vide, ignorée.`);
      return;
    }

    const options = [];
    let indexBonneReponse = -1;

    block.optionLines.forEach((optLine) => {
      const match = optLine.match(OPTION_LINE);
      if (!match) return; // ligne qui ne ressemble pas à une option, ignorée

      let text = match[2].trim();
      let isCorrect = false;

      // La bonne réponse est marquée par une étoile en début ou fin de ligne
      if (text.endsWith('*')) {
        isCorrect = true;
        text = text.slice(0, -1).trim();
      } else if (text.startsWith('*')) {
        isCorrect = true;
        text = text.slice(1).trim();
      }

      const optIndex = options.length;
      options.push(text);
      if (isCorrect) {
        if (indexBonneReponse !== -1) {
          errors.push(
            `Question ${questionNumber} : plusieurs bonnes réponses marquées, la première a été retenue.`
          );
        } else {
          indexBonneReponse = optIndex;
        }
      }
    });

    if (options.length < 2) {
      errors.push(
        `Question ${questionNumber} : moins de 2 options détectées, ignorée. Vérifiez le format (A) B) C) D)).`
      );
      return;
    }

    if (indexBonneReponse === -1) {
      errors.push(
        `Question ${questionNumber} : aucune bonne réponse marquée (attendu : "*"), ignorée.`
      );
      return;
    }

    questions.push({
      ordre: questions.length,
      enonce,
      options,
      indexBonneReponse,
    });
  });

  if (questions.length === 0 && errors.length === 0) {
    errors.push('Aucune question détectée. Vérifiez que le texte contient des lignes "Q: ...".');
  }

  return { questions, errors };
}

module.exports = { parseQcmText };
