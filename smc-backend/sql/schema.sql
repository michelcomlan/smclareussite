-- ============================================================
-- SMC la Réussite — Schéma de base de données (Supabase/PostgreSQL)
-- ============================================================
-- À exécuter dans l'éditeur SQL de Supabase (Project > SQL Editor)

-- Extension pour générer des UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Table: filiere (modifiable en base, pas en dur dans le code)
-- ------------------------------------------------------------
create table if not exists filiere (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now()
);

insert into filiere (nom) values
  ('MRH'), ('MCC'), ('EGP'), ('TL'), ('BFA'), ('FCA'), ('GMP'),
  ('Tourisme'), ('Hôtellerie Restauration')
on conflict (nom) do nothing;

-- ------------------------------------------------------------
-- Table: matiere (modifiable en base)
-- ------------------------------------------------------------
create table if not exists matiere (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  created_at timestamptz not null default now()
);

insert into matiere (nom) values
  ('Management des organisations'), ('Pratiques Professionnelles'), ('Spécialités')
on conflict (nom) do nothing;

-- ------------------------------------------------------------
-- Table: qcm
-- ------------------------------------------------------------
create table if not exists qcm (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  niveau text not null check (niveau in ('Licence', 'Master')),
  filiere_id uuid references filiere(id) on delete set null,
  matiere_id uuid references matiere(id) on delete set null,
  nombre_questions integer not null default 0,
  prix integer not null check (prix >= 0), -- en FCFA, entier (pas de centimes)
  publie boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_qcm_publie on qcm(publie);
create index if not exists idx_qcm_niveau on qcm(niveau);
create index if not exists idx_qcm_filiere on qcm(filiere_id);
create index if not exists idx_qcm_matiere on qcm(matiere_id);

-- ------------------------------------------------------------
-- Table: question
-- ------------------------------------------------------------
create table if not exists question (
  id uuid primary key default gen_random_uuid(),
  qcm_id uuid not null references qcm(id) on delete cascade,
  ordre integer not null default 0,
  enonce text not null,
  reponse text not null, -- réponse rédigée (format "fiche de révision")
  sous_categorie text, -- optionnel, ex : "Environnement de l'entreprise"
  difficulte text, -- optionnel, ex : "Facile" / "Moyen" / "Difficile"
  points integer, -- optionnel, poids de la question
  temps_limite integer, -- optionnel, en secondes
  created_at timestamptz not null default now()
);

create index if not exists idx_question_qcm on question(qcm_id);

-- ------------------------------------------------------------
-- Table: achat
-- Représente une tentative d'achat/paiement d'un QCM par un client
-- identifié par son numéro de téléphone (pas de compte utilisateur).
-- ------------------------------------------------------------
create table if not exists achat (
  id uuid primary key default gen_random_uuid(),
  qcm_id uuid not null references qcm(id) on delete restrict,
  reference_transaction text unique, -- référence FedaPay (transaction id)
  statut text not null default 'en_attente' check (statut in ('en_attente', 'confirme', 'echoue')),
  telephone text not null,
  montant integer not null, -- montant payé en FCFA, capturé au moment de l'achat
  token_acces text unique default encode(gen_random_bytes(16), 'hex'), -- lien de récupération d'accès
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_achat_qcm on achat(qcm_id);
create index if not exists idx_achat_telephone on achat(telephone);
create index if not exists idx_achat_statut on achat(statut);
create unique index if not exists idx_achat_reference on achat(reference_transaction) where reference_transaction is not null;

-- ------------------------------------------------------------
-- Table: etudiant
-- Inscription gratuite : nom, prénom, filière. Pas de mot de passe à
-- ce stade. Un numéro de téléphone identifie le compte d'une visite à
-- l'autre et sert à recevoir le code d'abonnement.
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
-- Un étudiant peut avoir plusieurs lignes au fil des mois (chaque
-- renouvellement = une nouvelle ligne, pas de prélèvement automatique).
-- L'abonnement "actif" est celui dont date_fin est dans le futur.
-- ------------------------------------------------------------
create table if not exists abonnement (
  id uuid primary key default gen_random_uuid(),
  etudiant_id uuid not null references etudiant(id) on delete cascade,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'actif', 'expire', 'echoue')),
  montant integer not null default 3000, -- FCFA
  reference_transaction text unique,
  code_abonnement text unique,
  date_debut timestamptz,
  date_fin timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_abonnement_etudiant on abonnement(etudiant_id);
create index if not exists idx_abonnement_statut on abonnement(statut);

-- ------------------------------------------------------------
-- Table: tentative_quiz
-- Reliée à un étudiant (nouveau modèle par abonnement) ou à un achat
-- unitaire (ancien modèle, conservé). Au moins l'un des deux est requis.
-- ------------------------------------------------------------
create table if not exists tentative_quiz (
  id uuid primary key default gen_random_uuid(),
  qcm_id uuid not null references qcm(id) on delete cascade,
  achat_id uuid references achat(id) on delete cascade,
  etudiant_id uuid references etudiant(id) on delete cascade,
  reponses jsonb not null, -- [{question_id, reussi: true|false}] (auto-évaluation)
  score integer not null, -- nombre de fiches marquées "réussi"
  score_sur integer not null, -- total de questions
  created_at timestamptz not null default now(),
  constraint tentative_quiz_lien_check check (achat_id is not null or etudiant_id is not null)
);

create index if not exists idx_tentative_achat on tentative_quiz(achat_id);
create index if not exists idx_tentative_etudiant on tentative_quiz(etudiant_id);

-- ------------------------------------------------------------
-- Table: otp_verification
-- Codes de vérification par SMS, pour protéger la route "retrouver mes
-- achats par téléphone" (sinon n'importe qui connaissant un numéro pourrait
-- lister les achats de quelqu'un d'autre).
-- ------------------------------------------------------------
create table if not exists otp_verification (
  id uuid primary key default gen_random_uuid(),
  telephone text not null,
  code_hash text not null,
  tentatives integer not null default 0,
  utilise boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_telephone on otp_verification(telephone);

-- Nettoyage optionnel : les codes expirés depuis longtemps peuvent être
-- purgés périodiquement (ex. via une fonction planifiée Supabase), ce n'est
-- pas strictement nécessaire pour le fonctionnement.

-- ------------------------------------------------------------
-- Table: admin (un seul compte)
-- Le mot de passe est hashé (bcrypt) côté back-end, jamais en clair.
-- ------------------------------------------------------------
create table if not exists admin (
  id uuid primary key default gen_random_uuid(),
  identifiant text not null unique,
  mot_de_passe_hash text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Table: cours
-- Cours par chapitre (documents et vidéos), consultables en ligne
-- sans téléchargement, réservés aux étudiants abonnés à leur filière.
-- ------------------------------------------------------------
create table if not exists cours (
  id uuid primary key default gen_random_uuid(),
  filiere_id uuid references filiere(id) on delete cascade,
  matiere_id uuid references matiere(id) on delete set null,
  chapitre text not null,
  titre text not null,
  type text not null check (type in ('document', 'video')),
  url text not null,
  ordre integer not null default 0,
  publie boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_cours_filiere on cours(filiere_id);
create index if not exists idx_cours_publie on cours(publie);

-- ============================================================
-- Row Level Security : on bloque l'accès direct depuis le front.
-- Toutes les écritures/lectures sensibles passent par le back-end
-- (clé service_role), jamais par la clé publique (anon).
-- ============================================================
alter table filiere enable row level security;
alter table matiere enable row level security;
alter table qcm enable row level security;
alter table question enable row level security;
alter table achat enable row level security;
alter table tentative_quiz enable row level security;
alter table admin enable row level security;
alter table otp_verification enable row level security;
alter table etudiant enable row level security;
alter table abonnement enable row level security;
alter table cours enable row level security;

-- Lecture publique autorisée uniquement pour le catalogue (QCM publiés) et les filtres
create policy "Lecture publique des filieres" on filiere for select using (true);
create policy "Lecture publique des matieres" on matiere for select using (true);
create policy "Lecture publique des qcm publies" on qcm for select using (publie = true);

-- Tout le reste (question avec bonnes réponses, achat, tentative_quiz, admin)
-- n'a AUCUNE policy de lecture publique : uniquement accessible via la clé
-- service_role utilisée côté serveur (le back-end contourne RLS avec cette clé).
