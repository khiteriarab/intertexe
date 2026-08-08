-- Short-lived one-time codes for Chrome/Safari extension auth handoff.
-- Service-role only; never expose via anon RLS.

CREATE TABLE IF NOT EXISTS public.extension_auth_codes (
  ext_session   text PRIMARY KEY,
  user_id       text NOT NULL,
  access_token  text NOT NULL,
  refresh_token text,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  consumed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS extension_auth_codes_expires_idx
  ON public.extension_auth_codes (expires_at);

ALTER TABLE public.extension_auth_codes ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — service role bypasses RLS.

COMMENT ON TABLE public.extension_auth_codes IS
  'One-time extension login bridge. Tokens parked after web login; consumed by extension poll.';
