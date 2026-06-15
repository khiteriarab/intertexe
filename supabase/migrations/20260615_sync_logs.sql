-- Feed sync monitoring — one row per rakuten/mytheresa sync run
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz DEFAULT now() NOT NULL,
  stats jsonb,
  status text DEFAULT 'success' NOT NULL,
  source text DEFAULT 'rakuten',
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_logs_run_at_idx ON public.sync_logs (run_at DESC);

COMMENT ON TABLE public.sync_logs IS 'Rakuten/Mytheresa feed sync run stats for monitoring';
