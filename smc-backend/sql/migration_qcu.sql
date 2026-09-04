-- ============================================================
-- Migration : support du format "épreuve QCU" (choix unique, A/B/C/D)
-- en complément du format "fiches de révision" déjà en place.
-- ============================================================
-- À exécuter en plus des migrations précédentes déjà passées.

-- Un QCM est maintenant soit en mode "fiche" (question → réponse rédigée
-- → auto-évaluation), soit en mode "qcu" (question → choix A/B/C/D →
-- correction automatique). Par défaut, tous les QCM existants restent
-- en mode "fiche" (aucun changement pour eux).
alter table qcm
  add column if not exists type_quiz text not null default 'fiche'
    check (type_quiz in ('fiche', 'qcu'));

-- La table question doit pouvoir stocker soit une réponse rédigée (mode
-- fiche), soit des choix multiples + l'index de la bonne réponse (mode
-- qcu). On rend "reponse" optionnelle et on ajoute les colonnes qcu.
alter table question
  alter column reponse drop not null;

alter table question
  add column if not exists options jsonb, -- ["Choix A", "Choix B", "Choix C", "Choix D"]
  add column if not exists index_bonne_reponse integer; -- index dans "options" (0-based)

-- Sécurité de cohérence : une question doit avoir soit une réponse
-- rédigée (fiche), soit des options + un index de bonne réponse (qcu) —
-- jamais les deux vides.
alter table question
  drop constraint if exists question_contenu_check;
alter table question
  add constraint question_contenu_check check (
    reponse is not null
    or (options is not null and index_bonne_reponse is not null)
  );
