-- ============================================================
-- Migration : passage au format "fiches de révision"
-- (question à réponse rédigée, au lieu de choix multiples A/B/C/D)
-- ============================================================
-- À exécuter dans l'éditeur SQL de Supabase, sur la base DÉJÀ EN LIGNE
-- (en plus du schema.sql déjà exécuté, pas à la place).

-- 1. Table question : remplacer options/index_bonne_reponse par reponse,
--    et ajouter les métadonnées présentes dans les vrais exports QCMmaker.
alter table question
  add column if not exists reponse text,
  add column if not exists sous_categorie text,
  add column if not exists difficulte text,
  add column if not exists points integer,
  add column if not exists temps_limite integer;

-- Les anciennes colonnes (options, index_bonne_reponse) ne sont plus utilisées
-- par le code. On les retire pour éviter toute confusion :
alter table question
  drop column if exists options,
  drop column if exists index_bonne_reponse;

-- reponse devient obligatoire une fois la colonne en place
-- (pas de "not null" direct ici car la table peut déjà contenir des lignes ;
-- en pratique, purgez les QCM de test existants avant de mettre en prod)
-- alter table question alter column reponse set not null;

-- 2. Table tentative_quiz : la colonne "reponses" stockait
--    [{question_id, index_choisi}] ; elle stocke maintenant
--    [{question_id, reussi}] — aucun changement de structure nécessaire
--    (jsonb reste jsonb), juste un changement de ce qu'on y met côté code.
