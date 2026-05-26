-- Email system: weekly edit queue + scan follow-up queue

CREATE TABLE IF NOT EXISTS public.weekly_edit_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL UNIQUE,
  products jsonb NOT NULL,
  collection_name text,
  collection_url text,
  collection_subline text,
  fiber_fact text,
  fiber_fact_fiber text,
  status text DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'sent', 'cancelled')),
  sent_count integer,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scan_follow_up_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  composition text,
  natural_fiber_percent integer,
  verdict text,
  alternatives_url text,
  send_at timestamptz NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_follow_up_pending
  ON public.scan_follow_up_queue (sent, send_at)
  WHERE sent = false;

ALTER TABLE public.weekly_edit_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_follow_up_queue ENABLE ROW LEVEL SECURITY;
