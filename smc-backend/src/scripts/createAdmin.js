/**
 * Script à exécuter UNE FOIS pour créer (ou réinitialiser) le compte admin.
 *
 * Usage :
 *   node src/scripts/createAdmin.js <identifiant> <mot_de_passe>
 *
 * Exemple :
 *   node src/scripts/createAdmin.js sedonoumichel "UnMotDePasseTresSolide!2026"
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');

async function main() {
  const [identifiant, motDePasse] = process.argv.slice(2);

  if (!identifiant || !motDePasse) {
    console.error('Usage: node src/scripts/createAdmin.js <identifiant> <mot_de_passe>');
    process.exit(1);
  }
  if (motDePasse.length < 10) {
    console.error('Le mot de passe doit contenir au moins 10 caractères.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(motDePasse, 12);

  // On supprime l'éventuel admin existant : un seul compte admin autorisé.
  await supabase.from('admin').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { error } = await supabase.from('admin').insert({
    identifiant,
    mot_de_passe_hash: hash,
  });

  if (error) {
    console.error('Erreur lors de la création du compte admin :', error);
    process.exit(1);
  }

  console.log(`Compte admin créé avec succès pour "${identifiant}".`);
  process.exit(0);
}

main();
