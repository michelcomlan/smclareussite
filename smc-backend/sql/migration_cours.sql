-- ============================================================
-- Migration : cours par chapitre (documents et vidéos)
-- ============================================================
-- À exécuter dans l'éditeur SQL de Supabase, EN PLUS des migrations
-- précédentes déjà passées.

create table if not exists cours (
  id uuid primary key default gen_random_uuid(),
  filiere_id uuid references filiere(id) on delete cascade,
  matiere_id uuid references matiere(id) on delete set null,
  chapitre text not null, -- ex : "Chapitre 1 : Introduction"
  titre text not null,
  type text not null check (type in ('document', 'video')),
  url text not null, -- lien vers le document (Drive, etc.) ou la vidéo (YouTube/Vimeo)
  ordre integer not null default 0,
  publie boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_cours_filiere on cours(filiere_id);
create index if not exists idx_cours_publie on cours(publie);

alter table cours enable row level security;
