-- Ejecutar en el SQL Editor de Supabase.
-- Los entity_id son los IDs externos de Hostinger/MySQL.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('app-images', 'app-images', true)
on conflict (id) do update set public = excluded.public;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('USER', 'BUSINESS', 'PRODUCT', 'CATEGORY')),
  entity_id text not null,
  field_name text not null,
  storage_bucket text not null default 'app-images',
  storage_path text not null unique,
  public_url text not null,
  mime_type text not null,
  byte_size bigint not null default 0,
  original_name text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_entity_idx
  on public.media_assets (entity_type, entity_id, field_name);

alter table public.media_assets enable row level security;

grant select on table public.media_assets to anon, authenticated;

drop policy if exists "media_assets_public_read" on public.media_assets;
create policy "media_assets_public_read"
  on public.media_assets
  for select
  to anon, authenticated
  using (true);
