-- Benchmark datasets with methodology. Never store identifiable peer customer rows.

CREATE TABLE IF NOT EXISTS public.benchmark_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  category text,
  market text,
  period_start date,
  period_end date,
  sample_size integer,
  provenance text,
  aggregation_rules text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.benchmark_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES public.benchmark_datasets (id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  median numeric,
  p25 numeric,
  p75 numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY benchmark_datasets_read ON public.benchmark_datasets FOR SELECT TO authenticated USING (true);
CREATE POLICY benchmark_metrics_read ON public.benchmark_metrics FOR SELECT TO authenticated USING (true);
