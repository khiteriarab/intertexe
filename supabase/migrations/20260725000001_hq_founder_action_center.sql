-- Founder Action Center (optional hardening).
-- Runtime already works on hq_tasks via metadata + entity_type='founder_action'.
-- Apply when a direct DB connection is available to add first-class columns/indexes.

ALTER TABLE public.hq_tasks
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expected_impact text,
  ADD COLUMN IF NOT EXISTS href text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS comparison_period text,
  ADD COLUMN IF NOT EXISTS confidence text,
  ADD COLUMN IF NOT EXISTS created_by_internal_user_id uuid REFERENCES public.hq_internal_users(id) ON DELETE SET NULL;

UPDATE public.hq_tasks
SET
  priority = COALESCE(priority, 'monitor'),
  category = COALESCE(category, 'monitor'),
  source = COALESCE(nullif(source, ''), 'manual')
WHERE priority IS NULL OR category IS NULL;

ALTER TABLE public.hq_tasks
  ALTER COLUMN priority SET DEFAULT 'monitor',
  ALTER COLUMN category SET DEFAULT 'monitor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_tasks_priority_check'
  ) THEN
    ALTER TABLE public.hq_tasks
      ADD CONSTRAINT hq_tasks_priority_check
      CHECK (priority IN ('critical', 'growth', 'operational', 'monitor'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_tasks_category_check'
  ) THEN
    ALTER TABLE public.hq_tasks
      ADD CONSTRAINT hq_tasks_category_check
      CHECK (category IN ('critical', 'growth', 'operational', 'monitor'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_tasks_confidence_check'
  ) THEN
    ALTER TABLE public.hq_tasks
      ADD CONSTRAINT hq_tasks_confidence_check
      CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hq_tasks_source_check'
  ) THEN
    ALTER TABLE public.hq_tasks
      ADD CONSTRAINT hq_tasks_source_check
      CHECK (source IN ('manual', 'rule', 'insight'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hq_tasks_workspace_fingerprint_uidx
  ON public.hq_tasks (workspace_id, fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hq_tasks_founder_action_entity_uidx
  ON public.hq_tasks (workspace_id, entity_id)
  WHERE entity_type = 'founder_action' AND entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS hq_tasks_workspace_status_priority_idx
  ON public.hq_tasks (workspace_id, status, priority, due_at);

COMMENT ON TABLE public.hq_tasks IS
  'Founder Action Center — prioritized operating queue for INTERTEXE HQ (not client SaaS).';

NOTIFY pgrst, 'reload schema';
