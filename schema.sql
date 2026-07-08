


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."event_types" AS ENUM (
    'scheduled',
    'fixed',
    'routine'
);


ALTER TYPE "public"."event_types" OWNER TO "postgres";


COMMENT ON TYPE "public"."event_types" IS 'Enum distinguishing calendar allocation and execution layout patterns. Supported values:
- "scheduled": Flexible events that were explicitly assigned to a specific time slot on the calendar assigned to a task.
- "fixed": Rigid, unmovable time blocks (e.g., external appointments, flights, or hard commitments).
- "routine": Automated or recurring calendar patterns generated periodically from a routine template.';



CREATE TYPE "public"."moment_types" AS ENUM (
    'created',
    'due',
    'estimate',
    'status',
    'started',
    'stopped',
    'scheduled',
    'target',
    'note',
    'priority',
    'definition'
);


ALTER TYPE "public"."moment_types" OWNER TO "postgres";


COMMENT ON TYPE "public"."moment_types" IS 'Enum defining valid types of life cycle events, state snapshots, and metric logs for the moments table. Supported values:
- "created": When an execution entity (project, section, task, event) is first instantiated in the system.
- "due": Hard deadline modifications, shifts, or updates (critical for tracking procrastination or delays).
- "estimate": Revisions, additions, or changes to the estimated execution time required for a task.
- "status": Workflow state transitions (e.g., changing from "pending" to "completed").
- "started": Dispatched automatically when a task log tracking session begins (starts counting time).
- "stopped": Dispatched automatically when an active task log is paused or finished (closes a time slot).
- "scheduled": Calendar allocation events or time block adjustments on the agenda.
- "target": Modifications to target dates.
- "note": Pure qualitative user text reflection or interaction notes (core source for behavioral analysis).
- "priority": Operational urgency or critical-level adjustments (e.g., scaling from medium to urgent).
- "definition": Structural edits, scope reformulations, or core textual redefinitions of an entity.';



CREATE TYPE "public"."priority" AS ENUM (
    'urgent',
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."priority" OWNER TO "postgres";


COMMENT ON TYPE "public"."priority" IS 'Enum mapping strict operational urgency and execution importance for tasks and projects. Supported values:
- "urgent": Immediate action required; critical blockers or hard deadlines that disrupt the entire workflow if ignored.
- "high": High-priority initiatives that yield significant impact and should be tackled as soon as urgent slots are cleared.
- "medium": Standard operational tasks representing routine work, sustainable progress, or baseline commitments.
- "low": Minor or flexible improvements, nice-to-have adjustments, or backlog items with no strict timeline constraints.';



CREATE TYPE "public"."status" AS ENUM (
    'planning',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'paused',
    'cancelled',
    'waiting'
);


ALTER TYPE "public"."status" OWNER TO "postgres";


COMMENT ON TYPE "public"."status" IS 'Global lifecycle state machine. Values:
- planning: Initiative or item is being structured/drafted (concept phase).
- todo: Ready to be tackled but active work has not started yet.
- in_progress: Active work is currently happening.
- in_review: Waiting for external validation, feedback, or approval.
- done: Completed successfully.
- paused: Temporarily halted or put on hold.
- cancelled: Aborted, no longer needed or pursued.
- waiting: Blocked because another entity or dependent step needs to be completed first.';



CREATE OR REPLACE FUNCTION "public"."insert_moment"("p_entity_column" "text", "p_entity_id" "uuid", "p_moment_type" "public"."moment_types", "p_value" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
begin
  if p_entity_column not in ('project_id', 'section_id', 'task_id', 'event_id') then
    raise exception 'insert_moment: invalid entity column "%"', p_entity_column;
  end if;

  execute format(
    'insert into moments (%I, moment_type, value, moment_note) values ($1, $2, $3, $4)',
    p_entity_column
  ) using p_entity_id, p_moment_type, p_value, p_note;
end;
$_$;


ALTER FUNCTION "public"."insert_moment"("p_entity_column" "text", "p_entity_id" "uuid", "p_moment_type" "public"."moment_types", "p_value" "text", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moment_entity_column"("p_table" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case p_table
    when 'projects' then 'project_id'
    when 'sections' then 'section_id'
    when 'tasks'    then 'task_id'
  end;
$$;


ALTER FUNCTION "public"."moment_entity_column"("p_table" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."task_logs" (
    "duration" "tstzrange" DEFAULT "tstzrange"("now"(), NULL::timestamp with time zone, '[)'::"text"),
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid"
);


ALTER TABLE "public"."task_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_logs" IS 'Log of task execution';



COMMENT ON COLUMN "public"."task_logs"."duration" IS 'Start and end time';



CREATE OR REPLACE FUNCTION "public"."stop_active_task"() RETURNS SETOF "public"."task_logs"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  -- Update the active task log, set upper bound to now(), and return the full row
  RETURN QUERY
  UPDATE task_logs
  SET duration = tstzrange(lower(duration), now(), '[)')
  WHERE upper_inf(duration) = true
  RETURNING *;
END;$$;


ALTER FUNCTION "public"."stop_active_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_project_delete_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at AND NEW.deleted_at IS NOT NULL THEN
        -- Atualiza seções filhas
        UPDATE public.sections
        SET deleted_at = NEW.deleted_at
        WHERE project_id = NEW.id AND deleted_at IS NULL;
        
        -- Atualiza eventos filhos diretamente ligados ao projeto
        UPDATE public.events
        SET deleted_at = NEW.deleted_at
        WHERE project_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_project_delete_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_section_delete_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at AND NEW.deleted_at IS NOT NULL THEN
        UPDATE public.tasks
        SET deleted_at = NEW.deleted_at
        WHERE section_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_section_delete_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_stop_and_start_task_log"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Close any existing active task log by setting its upper bound to now()
  UPDATE task_logs
  SET duration = tstzrange(lower(duration), now(), '[)')
  WHERE upper_inf(duration) = true;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_stop_and_start_task_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_fn_task_delete_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at AND NEW.deleted_at IS NOT NULL THEN
        UPDATE public.events
        SET deleted_at = NEW.deleted_at
        WHERE task_id = NEW.id AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_fn_task_delete_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_created"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'created');
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_due"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.due is distinct from NEW.due then
    perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'due', NEW.due::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_estimate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.estimate is distinct from NEW.estimate and NEW.estimate is not null then
    perform insert_moment('task_id', NEW.id, 'estimate', NEW.estimate::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_estimate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_priority"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.priority is distinct from NEW.priority then
    perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'priority', NEW.priority::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_priority"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.schedule IS DISTINCT FROM NEW.schedule then
    perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'scheduled', NEW.schedule::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_schedule"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_scheduled"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_column text;
  v_entity_id uuid;
begin
  if TG_OP = 'INSERT' or (OLD.duration is distinct from NEW.duration) then
    if NEW.task_id is not null then
      v_column := 'task_id';
      v_entity_id := NEW.task_id;
    elsif NEW.project_id is not null then
      v_column := 'project_id';
      v_entity_id := NEW.project_id;
    else
      v_column := 'event_id';
      v_entity_id := NEW.id;
    end if;

    perform insert_moment(v_column, v_entity_id, 'scheduled', lower(NEW.duration)::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_scheduled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_started"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Se o log for ativo (sem data de fim) e houver uma tarefa associada
  if upper_inf(NEW.duration) and NEW.task_id is not null then
    -- 1. Mantém o comportamento original de registrar o momento
    perform insert_moment('task_id', NEW.task_id, 'started', lower(NEW.duration)::text);
    
    -- 2. Altera o status da tarefa para 'in_progress' se já não for
    UPDATE public.tasks
    SET status = 'in_progress'::public.status
    WHERE id = NEW.task_id 
      AND status IS DISTINCT FROM 'in_progress'::public.status;
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_started"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.status is distinct from NEW.status then
    perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'status', NEW.status::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_stopped"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if upper_inf(OLD.duration) and not upper_inf(NEW.duration) and NEW.task_id is not null then
    perform insert_moment('task_id', NEW.task_id, 'stopped', upper(NEW.duration)::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_stopped"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_moment_target"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if OLD.target is distinct from NEW.target then
    perform insert_moment(moment_entity_column(TG_TABLE_NAME), NEW.id, 'target', NEW.target::text);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."trg_moment_target"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_sections_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Evita rodar o código se o status não mudou
    IF (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Regra 1: Done ou Cancelled
    IF NEW.status IN ('done', 'cancelled') THEN
        UPDATE sections
        SET status = 'cancelled'
        WHERE project_id = NEW.id 
          AND status NOT IN ('done', 'cancelled');

    -- Regra 2: Planning -> Todo
    ELSIF OLD.status = 'planning' AND NEW.status = 'todo' THEN
        UPDATE sections
        SET status = 'todo'
        WHERE project_id = NEW.id 
          AND status = 'planning';

    -- Regra 3: Qualquer outro status (ex: '*' -> paused)
    ELSE
        UPDATE sections
        SET status = NEW.status
        WHERE project_id = NEW.id 
          AND status NOT IN ('done', 'cancelled', NEW.status);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_sections_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_task_items_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (NEW.status = 'done') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE task_items
        SET done = TRUE
        WHERE task_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_task_items_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_tasks_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Regra 1: Done ou Cancelled
    IF NEW.status IN ('done', 'cancelled') THEN
        UPDATE tasks
        SET status = 'cancelled'
        WHERE section_id = NEW.id 
          AND status NOT IN ('done', 'cancelled');

    -- Regra 2: Planning -> Todo
    ELSIF OLD.status = 'planning' AND NEW.status = 'todo' THEN
        UPDATE tasks
        SET status = 'todo'
        WHERE section_id = NEW.id 
          AND status = 'planning';

    -- Regra 3: Qualquer outro status (ex: '*' -> paused)
    ELSE
        UPDATE tasks
        SET status = NEW.status
        WHERE section_id = NEW.id 
          AND status NOT IN ('done', 'cancelled', NEW.status);
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_tasks_status"() OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_task_log" WITH ("security_invoker"='on') AS
 SELECT "id",
    "task_id",
    "duration"
   FROM "public"."task_logs"
  WHERE ("upper_inf"("duration") = true);


ALTER VIEW "public"."active_task_log" OWNER TO "postgres";


COMMENT ON VIEW "public"."active_task_log" IS 'A view capturing all currently active and ongoing task tracking execution segments (where upper bound of duration is infinity), which is expected to be only one.';



COMMENT ON COLUMN "public"."active_task_log"."id" IS 'Primary key (UUID) inherited from the parent task log record.';



COMMENT ON COLUMN "public"."active_task_log"."task_id" IS 'Foreign key referencing the specific task currently being executed and timed.';



COMMENT ON COLUMN "public"."active_task_log"."duration" IS 'The timestamp range (tstzrange) representing when this tracking session started. The upper bound is infinity, indicating active execution.';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "name" "text" NOT NULL,
    "event_type" "public"."event_types" NOT NULL,
    "recurrent" boolean DEFAULT false NOT NULL,
    "duration" "tstzrange",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "project_id" "uuid",
    "field_id" "uuid",
    "routine_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "duration_must_be_bounded" CHECK (((NOT "lower_inf"("duration")) AND (NOT "upper_inf"("duration")) AND (NOT "isempty"("duration"))))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Stores calendar events, time blocks scheduled for tasks or routines.';



COMMENT ON COLUMN "public"."events"."name" IS 'Title or description of the event.';



COMMENT ON COLUMN "public"."events"."event_type" IS 'The category of the event. Must be one of the enum values: scheduled, fixed, routine.';



COMMENT ON COLUMN "public"."events"."recurrent" IS 'Boolean flag. True if the event is part of a recurring pattern or routine.';



COMMENT ON COLUMN "public"."events"."duration" IS 'The exact date and time range block for the event (tstzrange). Format example: "[2026-07-08 09:00:00-03, 2026-07-08 10:00:00-03]".';



COMMENT ON COLUMN "public"."events"."id" IS 'Primary key (UUID) of the event.';



COMMENT ON COLUMN "public"."events"."task_id" IS 'Optional foreign key linking this event to a specific task.';



COMMENT ON COLUMN "public"."events"."project_id" IS 'Optional foreign key linking this event to a specific project.';



COMMENT ON COLUMN "public"."events"."field_id" IS 'Foreign key referencing the operational workspace/field this event belongs to.';



COMMENT ON COLUMN "public"."events"."routine_id" IS 'Optional foreign key linking this event to the recurring routine template that generated it.';



COMMENT ON COLUMN "public"."events"."deleted_at" IS 'Soft delete timestamptz. If not null, the event is archived/deleted.';



CREATE TABLE IF NOT EXISTS "public"."fields" (
    "name" "text" NOT NULL,
    "doc_reference" "text",
    "order" smallint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "fields_order_check" CHECK (("order" > 0))
);


ALTER TABLE "public"."fields" OWNER TO "postgres";


COMMENT ON TABLE "public"."fields" IS 'Represents a domain or an area of interest that primarily groups and isolates projects.';



COMMENT ON COLUMN "public"."fields"."name" IS 'The human-readable name of the field. Used by the AI to identify contexts like "Art", "Coding", or "Personal".';



COMMENT ON COLUMN "public"."fields"."doc_reference" IS 'Optional URL pointing to external documentation, knowledge base, or reference materials related to this field.';



COMMENT ON COLUMN "public"."fields"."order" IS 'Display sort order priority (smallint) for rendering fields in the user interface.';



COMMENT ON COLUMN "public"."fields"."id" IS 'Primary key (UUID) unique identifier for the field.';



CREATE TABLE IF NOT EXISTS "public"."moment_tag_entities" (
    "moment_tag_id" "uuid",
    "project_id" "uuid",
    "section_id" "uuid",
    "task_id" "uuid",
    "event_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_single_entity" CHECK (("num_nonnulls"("project_id", "section_id", "task_id", "event_id") = 1))
);


ALTER TABLE "public"."moment_tag_entities" OWNER TO "postgres";


COMMENT ON TABLE "public"."moment_tag_entities" IS 'Many-to-many junction table that links a behavioral moment_tag to a specific project, section, task, or event. This allows the AI to stamp an active behavioral pattern directly onto an execution entity. Note: Exactly ONE entity foreign key must be populated per row.';



COMMENT ON COLUMN "public"."moment_tag_entities"."moment_tag_id" IS 'Foreign key referencing the parent behavioral/pattern tag.';



COMMENT ON COLUMN "public"."moment_tag_entities"."project_id" IS 'Optional foreign key linking this behavioral tag to a specific project. Must be null if section_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moment_tag_entities"."section_id" IS 'Optional foreign key linking this behavioral tag to a specific section phase. Must be null if project_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moment_tag_entities"."task_id" IS 'Optional foreign key linking this behavioral tag to a specific actionable task. Must be null if project_id, section_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moment_tag_entities"."event_id" IS 'Optional foreign key linking this behavioral tag to a specific calendar event. Must be null if project_id, section_id, or task_id is populated.';



COMMENT ON COLUMN "public"."moment_tag_entities"."id" IS 'Primary key (UUID) for this tag relationship entry.';



CREATE TABLE IF NOT EXISTS "public"."moment_tags" (
    "name" "text" NOT NULL,
    "synonyms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."moment_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."moment_tags" IS 'AI-generated behavioral taxonomy derived from user interactions and moment_notes. Used by the AI to detect psychological, emotional, environmental, or systemic patterns and bottlenecks over time (e.g., identifying that the user tends to get sick during "review" phases, or predicting high delay risks when a deadline changes more than three times).';



COMMENT ON COLUMN "public"."moment_tags"."name" IS 'The unique behavioral pattern, friction point, or context state captured or recognized by the AI (e.g., "Sickness", "Procrastination Risk", "Scope Creep", "Review Burnout").';



COMMENT ON COLUMN "public"."moment_tags"."synonyms" IS 'Array of text mapping equivalent terms, feelings, or expressions (aliases) to help the AI perform flexible semantic analysis and detect the correct tone from the user text.';



COMMENT ON COLUMN "public"."moment_tags"."id" IS 'Primary key (UUID) for this behavioral/pattern tag.';



CREATE TABLE IF NOT EXISTS "public"."moments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "section_id" "uuid",
    "task_id" "uuid",
    "event_id" "uuid",
    "moment_type" "public"."moment_types" DEFAULT 'note'::"public"."moment_types" NOT NULL,
    "value" "text",
    "moment_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_single_entity" CHECK (("num_nonnulls"("project_id", "section_id", "task_id", "event_id") = 1))
);


ALTER TABLE "public"."moments" OWNER TO "postgres";


COMMENT ON TABLE "public"."moments" IS 'Historical timeline log tracking state changes, status updates, estimate modifications, notes, and lifecycle events. Note: Exactly ONE entity foreign key (project_id, section_id, task_id, or event_id) must be populated per record; all others must be NULL.';



COMMENT ON COLUMN "public"."moments"."id" IS 'Primary key (UUID) of the moment log.';



COMMENT ON COLUMN "public"."moments"."project_id" IS 'Linked project ID (UUID) if this log belongs to a project lifecycle. Must be NULL if section_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moments"."section_id" IS 'Linked section ID (UUID) if this log belongs to a section. Must be NULL if project_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moments"."task_id" IS 'Linked task ID (UUID) if this log belongs to a task lifecycle. Must be NULL if project_id, section_id, or event_id is populated.';



COMMENT ON COLUMN "public"."moments"."event_id" IS 'Linked event ID (UUID) if this log tracks an event modification. Must be NULL if project_id, section_id, or task_id is populated.';



COMMENT ON COLUMN "public"."moments"."moment_type" IS 'The aspect being tracked (Enum: created, due, estimate, status, started, stopped, scheduled, target, note, priority, definition).';



COMMENT ON COLUMN "public"."moments"."value" IS 'The new state value saved at this moment (e.g., the string value of a new status or priority).';



COMMENT ON COLUMN "public"."moments"."moment_note" IS 'Optional text description or contextual note explaining the change.';



COMMENT ON COLUMN "public"."moments"."created_at" IS 'Timestamp when this log/moment was recorded.';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "name" "text" NOT NULL,
    "status" "public"."status" DEFAULT 'planning'::"public"."status" NOT NULL,
    "due" timestamp with time zone,
    "priority" "public"."priority" DEFAULT 'medium'::"public"."priority",
    "doc_reference" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid",
    "deleted_at" timestamp with time zone,
    "target" "tstzrange",
    CONSTRAINT "projects_schedule_valid" CHECK ((("target" IS NULL) OR ((NOT "isempty"("target")) AND (NOT "lower_inf"("target")) AND (("due" IS NULL) OR (("lower"("target") < "due") AND ("upper_inf"("target") OR ("upper"("target") <= "due")))))))
);

ALTER TABLE ONLY "public"."projects" REPLICA IDENTITY FULL;


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Represents a cohesive initiative, story, or project with a clear beginning, middle, and end. It forms a meaningful narrative broken down into distinct sequential chapters (sections) and executable steps (tasks).';



COMMENT ON COLUMN "public"."projects"."name" IS 'The official title of the project or initiative, capturing the essence of the narrative.';



COMMENT ON COLUMN "public"."projects"."status" IS 'Current milestone or lifecycle state of the project narrative, bound to public.status enum rules.';



COMMENT ON COLUMN "public"."projects"."due" IS 'The absolute final date for the entire project story (timestamptz). This date is not arbitrary and decided by a client or a contract.';



COMMENT ON COLUMN "public"."projects"."priority" IS 'Criticality, momentum, or urgency level of this initiative. Restricted to enum values: urgent, high, medium, low.';



COMMENT ON COLUMN "public"."projects"."doc_reference" IS 'Optional URL pointing to external specification, project brief, moodboard, or core documentation.';



COMMENT ON COLUMN "public"."projects"."id" IS 'Primary key (UUID) unique identifier for the project.';



COMMENT ON COLUMN "public"."projects"."field_id" IS 'Foreign key referencing the parent field (domain/area of interest) this project belongs to.';



COMMENT ON COLUMN "public"."projects"."deleted_at" IS 'Soft delete timestamptz. If populated, the project is considered archived or moved to the trash.';



COMMENT ON COLUMN "public"."projects"."target" IS 'The planned timeline horizon or date range allocated to develop this initiative (tstzrange). This range is arbitrary and must guide the scheduling of calendar events.';



CREATE TABLE IF NOT EXISTS "public"."routines" (
    "name" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "preferred_time" "text",
    "estimate" integer,
    "constraints" "text",
    "active" boolean DEFAULT true NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "field_id" "uuid"
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


COMMENT ON TABLE "public"."routines" IS 'Templates for recurring tasks, habits, or automated calendar patterns that periodically generate events.';



COMMENT ON COLUMN "public"."routines"."name" IS 'Name of the routine or habit (e.g., "Gym", "Weekly review", "Laundry").';



COMMENT ON COLUMN "public"."routines"."frequency" IS 'The recurrence pattern rule described in text or cron format (e.g., "daily", "every monday", "0 9 * * 1-5").';



COMMENT ON COLUMN "public"."routines"."preferred_time" IS 'The preferred time of day or calendar window to execute this routine (e.g., "09:00", "morning").';



COMMENT ON COLUMN "public"."routines"."estimate" IS 'Estimated duration in minutes for each generated occurrence of this routine.';



COMMENT ON COLUMN "public"."routines"."constraints" IS 'Textual description of scheduling restrictions or specific conditions (e.g., "Only on weekdays", "After breakfast").';



COMMENT ON COLUMN "public"."routines"."active" IS 'Boolean flag. If false, this routine is paused and stops generating new calendar events.';



COMMENT ON COLUMN "public"."routines"."id" IS 'Primary key (UUID) for this routine template.';



COMMENT ON COLUMN "public"."routines"."task_id" IS 'Optional foreign key linking this routine to a specific task template that requires recurring execution.';



COMMENT ON COLUMN "public"."routines"."field_id" IS 'Optional foreign key linking this routine to a specific workspace domain.';



CREATE TABLE IF NOT EXISTS "public"."sections" (
    "name" "text" NOT NULL,
    "status" "public"."status" DEFAULT 'planning'::"public"."status" NOT NULL,
    "due" timestamp with time zone,
    "priority" "public"."priority",
    "doc_reference" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "deleted_at" timestamp with time zone,
    "target" "tstzrange",
    CONSTRAINT "sections_schedule_valid" CHECK ((("target" IS NULL) OR ((NOT "isempty"("target")) AND (NOT "lower_inf"("target")) AND (("due" IS NULL) OR (("lower"("target") < "due") AND ("upper_inf"("target") OR ("upper"("target") <= "due")))))))
);

ALTER TABLE ONLY "public"."sections" REPLICA IDENTITY FULL;


ALTER TABLE "public"."sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."sections" IS 'Represents a distinct chapter, phase, sub-product, or side quest within a project narrative. It groups a set of executable steps (tasks) that naturally make sense together.';



COMMENT ON COLUMN "public"."sections"."name" IS 'The title of the section (e.g., "Discovery Phase", "MVP Release", "Side Quest: Bug Fixing").';



COMMENT ON COLUMN "public"."sections"."status" IS 'The current state of completion for this section, bound to public.status enum rules.';



COMMENT ON COLUMN "public"."sections"."due" IS 'The absolute final deadline for this section (timestamptz). This date is non-arbitrary and usually bound to client milestones or contracts.';



COMMENT ON COLUMN "public"."sections"."priority" IS 'The relative urgency or significance of this section within the project. Restricted to enum values: urgent, high, medium, low.';



COMMENT ON COLUMN "public"."sections"."doc_reference" IS 'Optional URL pointing to external specification, requirements, moodboard, or documentation specific to this section.';



COMMENT ON COLUMN "public"."sections"."id" IS 'Primary key (UUID) unique identifier for this section.';



COMMENT ON COLUMN "public"."sections"."project_id" IS 'Foreign key linking this section directly to its parent project narrative.';



COMMENT ON COLUMN "public"."sections"."deleted_at" IS 'Soft delete timestamptz. If populated, this section is archived/deleted.';



COMMENT ON COLUMN "public"."sections"."target" IS 'The planned timeline horizon or date range allocated to develop this section (tstzrange). This range is arbitrary and must guide the scheduling of calendar events.';



CREATE TABLE IF NOT EXISTS "public"."sections_sequence" (
    "section_previous" "uuid" NOT NULL,
    "section_next" "uuid" NOT NULL
);


ALTER TABLE "public"."sections_sequence" OWNER TO "postgres";


COMMENT ON TABLE "public"."sections_sequence" IS 'Defines the linear story progression, sequential order, or strict execution dependencies between project chapters, sub-products, or side quests (which section must come before which).';



COMMENT ON COLUMN "public"."sections_sequence"."section_previous" IS 'The preceding section that represents the dependency or previous chapter in the story timeline. While this relationship exists and the previous milestone is incomplete, the subsequent section status may reflect a "waiting" state.';



COMMENT ON COLUMN "public"."sections_sequence"."section_next" IS 'The subsequent section (chapter, sub-product, or side quest) that follows or is unlocked after the previous phase is completed.';



CREATE TABLE IF NOT EXISTS "public"."task_items" (
    "description" "text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "order" smallint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    CONSTRAINT "task_items_order_check" CHECK (("order" >= 0))
);


ALTER TABLE "public"."task_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_items" IS 'Checklist items for a task, used for micro-steps or binary acceptance criteria that do not need individual scheduling.';



COMMENT ON COLUMN "public"."task_items"."description" IS 'The concrete verification step or mini-task to be performed.';



COMMENT ON COLUMN "public"."task_items"."done" IS 'True if completed. Automatically turns TRUE if the parent task status shifts to "done".';



COMMENT ON COLUMN "public"."task_items"."order" IS 'Sequential display or execution order for the checklist.';



COMMENT ON COLUMN "public"."task_items"."id" IS 'Primary key (UUID) for this checklist item.';



COMMENT ON COLUMN "public"."task_items"."task_id" IS 'Foreign key linking this item to its parent task.';



ALTER TABLE "public"."task_items" ALTER COLUMN "order" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."task_items_order_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "name" "text" NOT NULL,
    "status" "public"."status" DEFAULT 'planning'::"public"."status" NOT NULL,
    "due" timestamp with time zone,
    "priority" "public"."priority" DEFAULT 'medium'::"public"."priority",
    "estimate" integer,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid",
    "deleted_at" timestamp with time zone,
    "target" "tstzrange",
    CONSTRAINT "tasks_schedule_valid" CHECK ((("target" IS NULL) OR ((NOT "isempty"("target")) AND (NOT "lower_inf"("target")) AND (("due" IS NULL) OR (("lower"("target") < "due") AND ("upper_inf"("target") OR ("upper"("target") <= "due")))))))
);

ALTER TABLE ONLY "public"."tasks" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Represents an actionable step, atomic execution item, or concrete movement within a section. It is the core executable unit required to progress and complete a chapter or side quest.';



COMMENT ON COLUMN "public"."tasks"."name" IS 'The actionable name or concise description of the task, usually a verb and its objects (e.g., "Draft login wireframe", "Implement JWT auth").';



COMMENT ON COLUMN "public"."tasks"."status" IS 'The current state of execution for this task, bound to public.status enum rules.';



COMMENT ON COLUMN "public"."tasks"."due" IS 'The strict final deadline for this specific task (timestamptz). This date is non-arbitrary.';



COMMENT ON COLUMN "public"."tasks"."priority" IS 'The relative urgency or execution priority of this step. Restricted to enum values: urgent, high, medium, low.';



COMMENT ON COLUMN "public"."tasks"."estimate" IS 'The estimated number of minutes required to fully complete this task. Used by the AI for time-blocking and planning.';



COMMENT ON COLUMN "public"."tasks"."id" IS 'Primary key (UUID) unique identifier for this task.';



COMMENT ON COLUMN "public"."tasks"."section_id" IS 'Foreign key linking this task to its parent section (chapter, sub-product, or side quest).';



COMMENT ON COLUMN "public"."tasks"."deleted_at" IS 'Soft delete timestamptz. If populated, this task is archived/deleted.';



COMMENT ON COLUMN "public"."tasks"."target" IS 'The planned timeline window or date range allocated to work on this task (tstzrange). This range is arbitrary and must guide the scheduling of calendar events.';



CREATE TABLE IF NOT EXISTS "public"."tasks_sequence" (
    "task_previous" "uuid" NOT NULL,
    "task_next" "uuid" NOT NULL
);


ALTER TABLE "public"."tasks_sequence" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks_sequence" IS 'Defines the direct linear execution order, workflow path, or strict chronological dependencies between tasks (which task unlocks which).';



COMMENT ON COLUMN "public"."tasks_sequence"."task_previous" IS 'The preceding task that must be completed or tackled before the next one (Foreign key to tasks). While this relationship exists and the workflow is blocked, the previous task status may reflect or impact the "waiting" lifecycle state.';



COMMENT ON COLUMN "public"."tasks_sequence"."task_next" IS 'The subsequent task that follows or is unlocked by the completion of the previous task (Foreign key to tasks).';



CREATE TABLE IF NOT EXISTS "public"."work_tag_entities" (
    "work_tag_id" "uuid",
    "project_id" "uuid",
    "section_id" "uuid",
    "task_id" "uuid",
    "event_id" "uuid",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "chk_single_entity" CHECK (("num_nonnulls"("project_id", "section_id", "task_id", "event_id") = 1))
);


ALTER TABLE "public"."work_tag_entities" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_tag_entities" IS 'Many-to-many junction table linking work_tags to a single project, section, task, or event. Exactly ONE entity foreign key (project_id, section_id, task_id, or event_id) must be populated.';



COMMENT ON COLUMN "public"."work_tag_entities"."work_tag_id" IS 'Foreign key referencing the parent execution tag.';



COMMENT ON COLUMN "public"."work_tag_entities"."project_id" IS 'Optional foreign key linking to a project. Must be null if section_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."work_tag_entities"."section_id" IS 'Optional foreign key linking to a section. Must be null if project_id, task_id, or event_id is populated.';



COMMENT ON COLUMN "public"."work_tag_entities"."task_id" IS 'Optional foreign key linking to a task. Must be null if project_id, section_id, or event_id is populated.';



COMMENT ON COLUMN "public"."work_tag_entities"."event_id" IS 'Optional foreign key linking to an event. Must be null if project_id, section_id, or task_id is populated.';



COMMENT ON COLUMN "public"."work_tag_entities"."id" IS 'Primary key (UUID) for this tag relationship entry.';



CREATE TABLE IF NOT EXISTS "public"."work_tags" (
    "name" "text" NOT NULL,
    "synonyms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."work_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_tags" IS 'AI-generated taxonomy reflecting the core operational nature of the work. Used by the AI to detect execution patterns, analyze structural metrics (e.g., how long task types usually take), and auto-suggest sub-tasks or project templates based on previous similar initiatives.';



COMMENT ON COLUMN "public"."work_tags"."name" IS 'The operational category or nature of work (e.g., "File conversion", "Calligraphy roll", "Backend dev").';



COMMENT ON COLUMN "public"."work_tags"."synonyms" IS 'Array of text mapping equivalent terms or aliases to help the AI perform flexible semantic tagging and searching.';



COMMENT ON COLUMN "public"."work_tags"."id" IS 'Primary key (UUID) for this execution tag.';



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fields"
    ADD CONSTRAINT "fields_order_key" UNIQUE ("order");



ALTER TABLE ONLY "public"."fields"
    ADD CONSTRAINT "fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moment_tags"
    ADD CONSTRAINT "moment_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."moment_tags"
    ADD CONSTRAINT "moment_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moments"
    ADD CONSTRAINT "moments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections_sequence"
    ADD CONSTRAINT "sections_sequence_pkey" PRIMARY KEY ("section_previous", "section_next");



ALTER TABLE ONLY "public"."task_items"
    ADD CONSTRAINT "task_items_order_key" UNIQUE ("order");



ALTER TABLE ONLY "public"."task_items"
    ADD CONSTRAINT "task_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_logs"
    ADD CONSTRAINT "task_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks_sequence"
    ADD CONSTRAINT "tasks_sequence_pkey" PRIMARY KEY ("task_previous", "task_next");



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_tags"
    ADD CONSTRAINT "work_tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."work_tags"
    ADD CONSTRAINT "work_tags_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_events_active" ON "public"."events" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_moment_tag_entities_event" ON "public"."moment_tag_entities" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_project" ON "public"."moment_tag_entities" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_section" ON "public"."moment_tag_entities" USING "btree" ("section_id") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_task" ON "public"."moment_tag_entities" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE INDEX "idx_moments_event" ON "public"."moments" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_moments_project" ON "public"."moments" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_moments_section" ON "public"."moments" USING "btree" ("section_id") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_moments_task" ON "public"."moments" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE INDEX "idx_projects_active" ON "public"."projects" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_sections_active" ON "public"."sections" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_task_logs_duration_upper_inf" ON "public"."task_logs" USING "btree" ("upper_inf"("duration")) WHERE ("upper_inf"("duration") = true);



CREATE INDEX "idx_tasks_active" ON "public"."tasks" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_work_tag_entities_event" ON "public"."work_tag_entities" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_work_tag_entities_project" ON "public"."work_tag_entities" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_work_tag_entities_section" ON "public"."work_tag_entities" USING "btree" ("section_id") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_work_tag_entities_task" ON "public"."work_tag_entities" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_moment_tag_entities_event" ON "public"."moment_tag_entities" USING "btree" ("moment_tag_id", "event_id") WHERE ("event_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_moment_tag_entities_project" ON "public"."moment_tag_entities" USING "btree" ("moment_tag_id", "project_id") WHERE ("project_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_moment_tag_entities_section" ON "public"."moment_tag_entities" USING "btree" ("moment_tag_id", "section_id") WHERE ("section_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_moment_tag_entities_task" ON "public"."moment_tag_entities" USING "btree" ("moment_tag_id", "task_id") WHERE ("task_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_work_tag_entities_event" ON "public"."work_tag_entities" USING "btree" ("work_tag_id", "event_id") WHERE ("event_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_work_tag_entities_project" ON "public"."work_tag_entities" USING "btree" ("work_tag_id", "project_id") WHERE ("project_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_work_tag_entities_section" ON "public"."work_tag_entities" USING "btree" ("work_tag_id", "section_id") WHERE ("section_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_work_tag_entities_task" ON "public"."work_tag_entities" USING "btree" ("work_tag_id", "task_id") WHERE ("task_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "after_project_status_update" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_sections_status"();



CREATE OR REPLACE TRIGGER "after_section_status_update" AFTER UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_tasks_status"();



CREATE OR REPLACE TRIGGER "after_task_status_update" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_task_items_status"();



CREATE OR REPLACE TRIGGER "moment_created_projects" AFTER INSERT ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_created"();



CREATE OR REPLACE TRIGGER "moment_created_sections" AFTER INSERT ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_created"();



CREATE OR REPLACE TRIGGER "moment_created_tasks" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_created"();



CREATE OR REPLACE TRIGGER "moment_due_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_due_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_due_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_estimate_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_estimate"();



CREATE OR REPLACE TRIGGER "moment_priority_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_priority_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_priority_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_schedule_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_schedule"();



CREATE OR REPLACE TRIGGER "moment_schedule_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_schedule"();



CREATE OR REPLACE TRIGGER "moment_schedule_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_schedule"();



CREATE OR REPLACE TRIGGER "moment_scheduled_events" AFTER INSERT OR UPDATE ON "public"."events" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_scheduled"();



CREATE OR REPLACE TRIGGER "moment_started_task_logs" AFTER INSERT ON "public"."task_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_started"();



CREATE OR REPLACE TRIGGER "moment_status_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_status_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_status_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW WHEN (("new"."deleted_at" IS NULL)) EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_stopped_task_logs" AFTER UPDATE ON "public"."task_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_stopped"();



CREATE OR REPLACE TRIGGER "moment_target_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_target"();



CREATE OR REPLACE TRIGGER "moment_target_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_target"();



CREATE OR REPLACE TRIGGER "moment_target_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_target"();



CREATE OR REPLACE TRIGGER "tg_project_delete_cascade" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_project_delete_cascade"();



CREATE OR REPLACE TRIGGER "tg_section_delete_cascade" BEFORE UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_section_delete_cascade"();



CREATE OR REPLACE TRIGGER "tg_task_delete_cascade" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_fn_task_delete_cascade"();



CREATE OR REPLACE TRIGGER "trg_stop_task_log_on_insert" BEFORE INSERT ON "public"."task_logs" FOR EACH ROW WHEN (("upper_inf"("new"."duration") = true)) EXECUTE FUNCTION "public"."trg_fn_stop_and_start_task_log"();



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_new_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_new_moment_tag_id_fkey" FOREIGN KEY ("moment_tag_id") REFERENCES "public"."moment_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_new_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_new_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moment_tag_entities"
    ADD CONSTRAINT "moment_tag_entities_new_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moments"
    ADD CONSTRAINT "moments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moments"
    ADD CONSTRAINT "moments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moments"
    ADD CONSTRAINT "moments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moments"
    ADD CONSTRAINT "moments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."sections_sequence"
    ADD CONSTRAINT "sections_sequence_section_next_fkey" FOREIGN KEY ("section_next") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."sections_sequence"
    ADD CONSTRAINT "sections_sequence_section_previous_fkey" FOREIGN KEY ("section_previous") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."task_items"
    ADD CONSTRAINT "task_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."tasks_sequence"
    ADD CONSTRAINT "tasks_sequence_task_next_fkey" FOREIGN KEY ("task_next") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."tasks_sequence"
    ADD CONSTRAINT "tasks_sequence_task_previous_fkey" FOREIGN KEY ("task_previous") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."task_logs"
    ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id");



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_new_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_new_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_new_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_new_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_tag_entities"
    ADD CONSTRAINT "work_tag_entities_new_work_tag_id_fkey" FOREIGN KEY ("work_tag_id") REFERENCES "public"."work_tags"("id") ON DELETE CASCADE;



CREATE POLICY "allow all" ON "public"."events" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."fields" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."moment_tag_entities" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."moment_tags" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."moments" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."projects" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."routines" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."sections" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."sections_sequence" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."task_items" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."task_logs" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."tasks" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."tasks_sequence" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."work_tag_entities" USING (true) WITH CHECK (true);



CREATE POLICY "allow all" ON "public"."work_tags" USING (true) WITH CHECK (true);



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moment_tag_entities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moment_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."moments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections_sequence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks_sequence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_tag_entities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_tags" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_moment"("p_entity_column" "text", "p_entity_id" "uuid", "p_moment_type" "public"."moment_types", "p_value" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_moment"("p_entity_column" "text", "p_entity_id" "uuid", "p_moment_type" "public"."moment_types", "p_value" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_moment"("p_entity_column" "text", "p_entity_id" "uuid", "p_moment_type" "public"."moment_types", "p_value" "text", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."moment_entity_column"("p_table" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."moment_entity_column"("p_table" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."moment_entity_column"("p_table" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."task_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_logs" TO "service_role";



GRANT ALL ON FUNCTION "public"."stop_active_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."stop_active_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."stop_active_task"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_project_delete_cascade"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_project_delete_cascade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_project_delete_cascade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_section_delete_cascade"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_section_delete_cascade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_section_delete_cascade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_fn_task_delete_cascade"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_task_delete_cascade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_task_delete_cascade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_due"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_due"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_due"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_estimate"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_estimate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_estimate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_priority"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_priority"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_priority"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_scheduled"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_scheduled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_scheduled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_started"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_started"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_started"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_stopped"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_stopped"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_stopped"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_moment_target"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_moment_target"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_moment_target"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_sections_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_sections_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_sections_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_task_items_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_task_items_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_task_items_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_tasks_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_tasks_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_tasks_status"() TO "service_role";



GRANT ALL ON TABLE "public"."active_task_log" TO "anon";
GRANT ALL ON TABLE "public"."active_task_log" TO "authenticated";
GRANT ALL ON TABLE "public"."active_task_log" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."fields" TO "anon";
GRANT ALL ON TABLE "public"."fields" TO "authenticated";
GRANT ALL ON TABLE "public"."fields" TO "service_role";



GRANT ALL ON TABLE "public"."moment_tag_entities" TO "anon";
GRANT ALL ON TABLE "public"."moment_tag_entities" TO "authenticated";
GRANT ALL ON TABLE "public"."moment_tag_entities" TO "service_role";



GRANT ALL ON TABLE "public"."moment_tags" TO "anon";
GRANT ALL ON TABLE "public"."moment_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."moment_tags" TO "service_role";



GRANT ALL ON TABLE "public"."moments" TO "anon";
GRANT ALL ON TABLE "public"."moments" TO "authenticated";
GRANT ALL ON TABLE "public"."moments" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT ALL ON TABLE "public"."routines" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."sections_sequence" TO "anon";
GRANT ALL ON TABLE "public"."sections_sequence" TO "authenticated";
GRANT ALL ON TABLE "public"."sections_sequence" TO "service_role";



GRANT ALL ON TABLE "public"."task_items" TO "anon";
GRANT ALL ON TABLE "public"."task_items" TO "authenticated";
GRANT ALL ON TABLE "public"."task_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."task_items_order_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."task_items_order_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."tasks_sequence" TO "anon";
GRANT ALL ON TABLE "public"."tasks_sequence" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks_sequence" TO "service_role";



GRANT ALL ON TABLE "public"."work_tag_entities" TO "anon";
GRANT ALL ON TABLE "public"."work_tag_entities" TO "authenticated";
GRANT ALL ON TABLE "public"."work_tag_entities" TO "service_role";



GRANT ALL ON TABLE "public"."work_tags" TO "anon";
GRANT ALL ON TABLE "public"."work_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."work_tags" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







