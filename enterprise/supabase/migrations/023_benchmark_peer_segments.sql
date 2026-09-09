-- Peer segment dimension for governed benchmark datasets (luxury / contemporary / mass).

ALTER TABLE public.benchmark_datasets
  ADD COLUMN IF NOT EXISTS peer_segment text;

ALTER TABLE public.benchmark_datasets
  DROP CONSTRAINT IF EXISTS benchmark_datasets_peer_segment_chk;
ALTER TABLE public.benchmark_datasets
  ADD CONSTRAINT benchmark_datasets_peer_segment_chk
  CHECK (peer_segment IS NULL OR peer_segment IN ('luxury', 'contemporary', 'mass'));

CREATE UNIQUE INDEX IF NOT EXISTS benchmark_datasets_market_segment_uidx
  ON public.benchmark_datasets (market, category, peer_segment, period_start)
  WHERE peer_segment IS NOT NULL AND status = 'approved';
