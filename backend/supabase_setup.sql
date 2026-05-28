-- Supabase SQL setup for receipt storage metadata
-- Run this in Supabase SQL Editor after creating the storage bucket named `receipts`.

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  organization_id text,
  file_name text not null,
  storage_path text not null,
  public_url text,
  size bigint,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists receipts_organization_id_idx on receipts (organization_id);
create index if not exists receipts_created_at_idx on receipts (created_at desc);
