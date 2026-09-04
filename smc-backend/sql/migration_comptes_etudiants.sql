-- ============================================================
-- Migration : comptes étudiants + abonnement mensuel
-- ============================================================
-- À exécuter dans l'éditeur SQL de Supabase, EN PLUS des migrations
-- précédentes (schema.sql, migration_format_fiches.sql déjà passées).

-- ------------------------------------------------------------
-- Table: etudiant
-- Inscription gratuite : nom, prénom, filière. Pas de mot de passe
-- à ce stade (barrière d'entrée minimale). Un numéro de téléphone est
-- demandé pour retrouver son compte d'une visite à l'autre et recevoir
-- le code d'abonnement.
-- ------------------------------------------------------------
create table if not exists etudiant (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  filiere_id uuid references filiere(id) on delete set null,
  telephone text,
  created_at timestamptz not null default now()
);

create index if not exists idx_etudiant_telephone on etudiant(telephone);
create index if not exists idx_etudiant_filiere on etudiant(filiere_id);

-- ------------------------------------------------------------
-- Table: abonnement
-- Un étudiant peut avoir plusieurs lignes au fil des mois (un
-- renouvellement = une nouvelle ligne, pas un prélèvement automatique
-- — peu fiable en Mobile Money au Bénin). L'abonnement "actif" est
-- celui dont date_fin est dans le futur.
-- ------------------------------------------------------------
create table if not exists abonnement (
  id uuid primary key default gen_random_uuid(),
  etudiant_id uuid not null references etudiant(id) on delete cascade,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'actif', 'expire', 'echoue')),
  montant integer not null default 3000, -- FCFA
  reference_transaction text unique,
  code_abonnement text unique, -- généré à l'activation, communiqué à l'étudiant
  date_debut timestamptz,
  date_fin timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_abonnement_etudiant on abonnement(etudiant_id);
create index if not exists idx_abonnement_statut on abonnement(statut);
create unique index if not exists idx_abonnement_reference on abonnement(reference_transaction) where reference_transaction is not null;

-- ------------------------------------------------------------
-- tentative_quiz : on relie désormais une tentative à un étudiant
-- (nouveau modèle par abonnement) plutôt qu'obligatoirement à un achat
-- unitaire (ancien modèle, conservé pour ne rien casser côté existant).
-- ------------------------------------------------------------
alter table tentative_quiz
  add column if not exists etudiant_id uuid references etudiant(id) on delete cascade;

alter table tentative_quiz
  alter column achat_id drop not null;

-- Sécurité : chaque tentative doit être reliée à au moins un des deux
alter table tentative_quiz
  drop constraint if exists tentative_quiz_lien_check;
alter table tentative_quiz
  add constraint tentative_quiz_lien_check check (achat_id is not null or etudiant_id is not null);

-- ------------------------------------------------------------
-- RLS : comme les autres tables sensibles, aucune lecture/écriture
-- publique — tout passe par le back-end (clé service_role).
-- ------------------------------------------------------------
alter table etudiant enable row level security;
alter table abonnement enable row level security;
