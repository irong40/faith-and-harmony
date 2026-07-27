BEGIN;

CREATE TABLE public.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  description text,
  item_type text NOT NULL DEFAULT 'task'
    CHECK (item_type IN ('task', 'approval', 'decision', 'risk', 'blocker')),
  department text NOT NULL
    CHECK (department IN ('executive', 'revenue', 'operations', 'finance', 'compliance', 'marketing', 'technology')),
  status text NOT NULL DEFAULT 'inbox'
    CHECK (status IN ('inbox', 'planned', 'in_progress', 'waiting', 'blocked', 'needs_approval', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  due_at timestamptz,
  completed_at timestamptz,
  source_system text NOT NULL DEFAULT 'manual'
    CHECK (source_system IN ('crm', 'obsidian', 'agent', 'manual')),
  source_ref text,
  parent_id uuid REFERENCES public.work_items(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_items_completion_consistency CHECK (
    (status IN ('done', 'cancelled') AND completed_at IS NOT NULL)
    OR (status NOT IN ('done', 'cancelled') AND completed_at IS NULL)
  )
);

CREATE UNIQUE INDEX work_items_source_ref_unique
  ON public.work_items (source_system, source_ref);
CREATE INDEX work_items_status_idx ON public.work_items (status, priority, due_at);
CREATE INDEX work_items_department_idx ON public.work_items (department, status);
CREATE INDEX work_items_owner_idx ON public.work_items (owner_id, status);
CREATE INDEX work_items_due_at_idx ON public.work_items (due_at) WHERE due_at IS NOT NULL;
CREATE INDEX work_items_parent_idx ON public.work_items (parent_id) WHERE parent_id IS NOT NULL;

CREATE TABLE public.work_item_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (length(btrim(event_type)) BETWEEN 1 AND 80),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX work_item_events_item_time_idx
  ON public.work_item_events (work_item_id, created_at DESC);

CREATE TABLE public.work_item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE RESTRICT,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX work_item_comments_item_time_idx
  ON public.work_item_comments (work_item_id, created_at DESC);

CREATE TABLE public.work_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE RESTRICT,
  target_type text NOT NULL CHECK (length(btrim(target_type)) BETWEEN 1 AND 80),
  target_ref text NOT NULL CHECK (length(btrim(target_ref)) BETWEEN 1 AND 2000),
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_item_id, target_type, target_ref)
);

CREATE INDEX work_item_links_item_idx ON public.work_item_links (work_item_id);

CREATE TABLE public.department_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL
    CHECK (department IN ('executive', 'revenue', 'operations', 'finance', 'compliance', 'marketing', 'technology')),
  health text NOT NULL CHECK (health IN ('healthy', 'watch', 'blocked')),
  objective text,
  summary text NOT NULL CHECK (length(btrim(summary)) BETWEEN 1 AND 5000),
  blockers text[] NOT NULL DEFAULT '{}',
  report_path text,
  source_system text NOT NULL DEFAULT 'manual'
    CHECK (source_system IN ('crm', 'obsidian', 'agent', 'manual')),
  source_ref text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX department_updates_latest_idx
  ON public.department_updates (department, reported_at DESC);
CREATE UNIQUE INDEX department_updates_source_ref_unique
  ON public.department_updates (source_system, source_ref);

CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL CHECK (direction IN ('vault_to_crm', 'crm_to_vault')),
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  proposed_count integer NOT NULL DEFAULT 0 CHECK (proposed_count >= 0),
  applied_count integer NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
  skipped_count integer NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT sync_runs_completion_consistency CHECK (
    (status = 'running' AND completed_at IS NULL)
    OR (status <> 'running' AND completed_at IS NOT NULL)
  )
);

CREATE INDEX sync_runs_status_time_idx ON public.sync_runs (status, started_at DESC);

CREATE OR REPLACE FUNCTION public.command_center_prepare_work_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
  ELSE
    NEW.version := OLD.version + 1;
  END IF;

  IF NEW.status IN ('done', 'cancelled') THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
  ELSIF NEW.status NOT IN ('done', 'cancelled') THEN
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.command_center_log_work_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.work_item_events (work_item_id, event_type, actor_id, data)
    VALUES (
      NEW.id,
      'created',
      auth.uid(),
      jsonb_build_object('status', NEW.status, 'priority', NEW.priority, 'source_system', NEW.source_system)
    );
  ELSIF ROW(NEW.status, NEW.priority, NEW.owner_id, NEW.due_at, NEW.department, NEW.item_type)
    IS DISTINCT FROM ROW(OLD.status, OLD.priority, OLD.owner_id, OLD.due_at, OLD.department, OLD.item_type) THEN
    INSERT INTO public.work_item_events (work_item_id, event_type, actor_id, data)
    VALUES (
      NEW.id,
      'updated',
      auth.uid(),
      jsonb_build_object(
        'before', jsonb_build_object(
          'status', OLD.status,
          'priority', OLD.priority,
          'owner_id', OLD.owner_id,
          'due_at', OLD.due_at,
          'department', OLD.department,
          'item_type', OLD.item_type
        ),
        'after', jsonb_build_object(
          'status', NEW.status,
          'priority', NEW.priority,
          'owner_id', NEW.owner_id,
          'due_at', NEW.due_at,
          'department', NEW.department,
          'item_type', NEW.item_type
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.command_center_reject_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'work_item_events are append-only';
END;
$$;

CREATE TRIGGER prepare_work_item_before_write
  BEFORE INSERT OR UPDATE ON public.work_items
  FOR EACH ROW EXECUTE FUNCTION public.command_center_prepare_work_item();

CREATE TRIGGER log_work_item_after_write
  AFTER INSERT OR UPDATE ON public.work_items
  FOR EACH ROW EXECUTE FUNCTION public.command_center_log_work_item_event();

CREATE TRIGGER reject_work_item_event_mutation
  BEFORE UPDATE OR DELETE ON public.work_item_events
  FOR EACH ROW EXECUTE FUNCTION public.command_center_reject_event_mutation();

CREATE TRIGGER set_work_item_comments_updated_at
  BEFORE UPDATE ON public.work_item_comments
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER set_department_updates_updated_at
  BEFORE UPDATE ON public.department_updates
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admins_read_work_items ON public.work_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_insert_work_items ON public.work_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_update_work_items ON public.work_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admins_read_work_item_events ON public.work_item_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_insert_work_item_events ON public.work_item_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY admins_all_work_item_comments ON public.work_item_comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_all_work_item_links ON public.work_item_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_all_department_updates ON public.department_updates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admins_read_sync_runs ON public.sync_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY service_role_read_work_items ON public.work_items
  FOR SELECT TO service_role USING (true);
CREATE POLICY service_role_insert_work_items ON public.work_items
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY service_role_update_work_items ON public.work_items
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_read_work_item_events ON public.work_item_events
  FOR SELECT TO service_role USING (true);
CREATE POLICY service_role_insert_work_item_events ON public.work_item_events
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY service_role_all_work_item_comments ON public.work_item_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_work_item_links ON public.work_item_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_department_updates ON public.department_updates
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_sync_runs ON public.sync_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.work_items FROM anon;
REVOKE ALL ON public.work_item_events FROM anon;
REVOKE ALL ON public.work_item_comments FROM anon;
REVOKE ALL ON public.work_item_links FROM anon;
REVOKE ALL ON public.department_updates FROM anon;
REVOKE ALL ON public.sync_runs FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.work_items TO authenticated, service_role;
GRANT SELECT, INSERT ON public.work_item_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_item_comments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_item_links TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_updates TO authenticated, service_role;
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_runs TO service_role;

COMMENT ON TABLE public.work_items IS 'Operational authority for company tasks, approvals, decisions, risks, and blockers.';
COMMENT ON TABLE public.work_item_events IS 'Append-only work item lifecycle event log.';
COMMENT ON TABLE public.department_updates IS 'Latest structured department health reports linked to long-form vault context.';
COMMENT ON TABLE public.sync_runs IS 'Audit trail for guarded CRM and Obsidian synchronization.';

COMMIT;
