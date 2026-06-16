alter table if exists public.designers
  add column if not exists editorial_image_url text,
  add column if not exists hero_image_url text;
