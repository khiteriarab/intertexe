-- Organization region and units of measure (set during onboarding; editable in Settings).
alter table public.organizations
  add column if not exists country_code text,
  add column if not exists preferred_mass_unit text not null default 'metric',
  add column if not exists measurement_preferences jsonb not null default '{}'::jsonb;

alter table public.organizations
  drop constraint if exists organizations_preferred_mass_unit_check;

alter table public.organizations
  add constraint organizations_preferred_mass_unit_check
  check (preferred_mass_unit in ('metric', 'imperial'));

comment on column public.organizations.country_code is 'ISO 3166-1 alpha-2 headquarters / operating country for the brand workspace.';
comment on column public.organizations.preferred_mass_unit is 'Display unit system for mass fields (metric=g/kg, imperial=oz/lb). Canonical storage remains grams.';
comment on column public.organizations.measurement_preferences is 'Extensible unit prefs: length, volume, currency display, etc.';
