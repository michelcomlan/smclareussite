const zlib = require('zlib');

/**
 * Extrait le texte brut de word/document.xml d'un fichier .docx, sans
 * dépendance externe : lecture manuelle du ZIP (méthode "store" ou
 * "deflate") + extraction des paragraphes <w:p> et de leurs runs <w:t>.
 */
function extraireParagraphes(buffer) {
  const entree = trouverEntreeZip(buffer, 'word/document.xml');
  if (!entree) throw new Error("word/document.xml introuvable dans le fichier .docx");

  const xml = entree.toString('utf8');

  // Chaque paragraphe Word est un bloc <w:p ...>...</w:p>
  const paragraphes = [];
  const regexParagraphe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let matchP;
  while ((matchP = regexParagraphe.exec(xml)) !== null) {
    const blocParagraphe = matchP[0];
    // Texte des runs <w:t>...</w:t> à l'intérieur de ce paragraphe
    const regexTexte = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let texte = '';
    let matchT;
    while ((matchT = regexTexte.exec(blocParagraphe)) !== null) {
      texte += decoderEntitesXml(matchT[1]);
    }
    // Une tabulation Word (<w:tab/>) devient une vraie tabulation
    if (/<w:tab\s*\/>/.test(blocParagraphe)) texte += '\t';
    paragraphes.push(texte);
  }

  return paragraphes;
}

function decoderEntitesXml(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Lecture minimale d'un fichier ZIP (format .docx) : parcourt le
 * "End of Central Directory", puis la table centrale, pour retrouver
 * l'entrée demandée et la décompresser (store=0 ou deflate=8).
 */
function trouverEntreeZip(buffer, nomFichier) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Fichier .docx invalide (ZIP non reconnu).');

  const totalEntrees = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

  let offset = centralDirOffset;
  for (let i = 0; i < totalEntrees; i++) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) break;

    const methodeCompression = buffer.readUInt16LE(offset + 10);
    const tailleCompressee = buffer.readUInt32LE(offset + 20);
    const longueurNom = buffer.readUInt16LE(offset + 28);
    const longueurExtra = buffer.readUInt16LE(offset + 30);
    const longueurCommentaire = buffer.readUInt16LE(offset + 32);
    const offsetHeaderLocal = buffer.readUInt32LE(offset + 42);
    const nom = buffer.toString('utf8', offset + 46, offset + 46 + longueurNom);

    if (nom === nomFichier) {
      // Header local : il faut relire ses champs pour connaître le vrai
      // décalage des données (le nom/extra peuvent différer légèrement).
      const longueurNomLocal = buffer.readUInt16LE(offsetHeaderLocal + 26);
      const longueurExtraLocal = buffer.readUInt16LE(offsetHeaderLocal + 28);
      const debutDonnees = offsetHeaderLocal + 30 + longueurNomLocal + longueurExtraLocal;
      const donnees = buffer.subarray(debutDonnees, debutDonnees + tailleCompressee);

      if (methodeCompression === 0) return donnees; // stocké sans compression
      if (methodeCompression === 8) return zlib.inflateRawSync(donnees); // deflate
      throw new Error(`Méthode de compression ZIP non supportée: ${methodeCompression}`);
    }

    offset += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }

  return null;
}

module.exports = { extraireParagraphes };
