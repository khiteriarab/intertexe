-- Enterprise foundation: enums, profiles, helpers.
-- Applied only to obelisk-core. RLS is enabled from the first table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.enterprise_org_kind AS ENUM ('customer_zero', 'customer', 'demo', 'snapshot', 'pilot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_plan_key AS ENUM ('free_snapshot', 'founding_pilot', 'saas', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_account_state AS ENUM (
    'invited', 'active', 'paused', 'converted', 'declined', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_membership_role AS ENUM (
    'owner',
    'admin',
    'product_manager',
    'sustainability',
    'reviewer',
    'developer',
    'read_only',
    'supplier_contributor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_membership_status AS ENUM ('invited', 'active', 'suspended', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_field_state AS ENUM (
    'observed', 'normalized', 'derived', 'conflicted', 'missing', 'unverified', 'approved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_access_class AS ENUM ('public', 'restricted', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.enterprise_job_status AS ENUM (
    'queued', 'running', 'succeeded', 'failed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles may exist before obelisk-core Auth users. Super-admin is server-only.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text,
  intertexe_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_self_select
  ON public.profiles FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY profiles_self_update
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid() AND intertexe_super_admin IS NOT DISTINCT FROM (
    SELECT p.intertexe_super_admin FROM public.profiles p WHERE p.auth_user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
