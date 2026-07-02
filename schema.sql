


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


COMMENT ON TYPE "public"."event_types" IS 'Event types';



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


COMMENT ON TYPE "public"."moment_types" IS 'Moment types';



CREATE TYPE "public"."priority" AS ENUM (
    'urgent',
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."priority" OWNER TO "postgres";


COMMENT ON TYPE "public"."priority" IS 'Priority';



CREATE TYPE "public"."status" AS ENUM (
    'planning',
    'todo',
    'in_progress',
    'in_review',
    'done',
    'paused',
    'cancelled',
    'archived'
);


ALTER TYPE "public"."status" OWNER TO "postgres";


COMMENT ON TYPE "public"."status" IS 'Status';



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
  if upper_inf(NEW.duration) and NEW.task_id is not null then
    perform insert_moment('task_id', NEW.task_id, 'started', lower(NEW.duration)::text);
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


CREATE OR REPLACE FUNCTION "public"."trigger_update_sections_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Verifica se o status mudou para 'done' ou 'cancelled'
    IF (NEW.status IN ('done', 'cancelled')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE sections
        SET status = 'cancelled'
        WHERE project_id = NEW.id 
          AND status NOT IN ('done', 'cancelled');
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
    IF (NEW.status IN ('done', 'cancelled')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        UPDATE tasks
        SET status = 'cancelled'
        WHERE section_id = NEW.id 
          AND status NOT IN ('done', 'cancelled');
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
    CONSTRAINT "duration_must_be_bounded" CHECK (((NOT "lower_inf"("duration")) AND (NOT "upper_inf"("duration")) AND (NOT "isempty"("duration"))))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Events for the calendar, including plans';



COMMENT ON COLUMN "public"."events"."name" IS 'Title of the event';



COMMENT ON COLUMN "public"."events"."event_type" IS 'Event type';



COMMENT ON COLUMN "public"."events"."recurrent" IS 'If event is recurrent';



CREATE TABLE IF NOT EXISTS "public"."fields" (
    "name" "text" NOT NULL,
    "doc_reference" "text",
    "order" smallint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "fields_order_check" CHECK (("order" > 0))
);


ALTER TABLE "public"."fields" OWNER TO "postgres";


COMMENT ON TABLE "public"."fields" IS 'Project fields';



COMMENT ON COLUMN "public"."fields"."name" IS 'Name of the field';



COMMENT ON COLUMN "public"."fields"."doc_reference" IS 'Documentation URL';



COMMENT ON COLUMN "public"."fields"."order" IS 'Display order';



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


CREATE TABLE IF NOT EXISTS "public"."moment_tags" (
    "name" "text" NOT NULL,
    "synonyms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."moment_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."moment_tags" IS 'Moment tags';



COMMENT ON COLUMN "public"."moment_tags"."name" IS 'Tag';



COMMENT ON COLUMN "public"."moment_tags"."synonyms" IS 'Array of synonyms';



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


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "name" "text" NOT NULL,
    "status" "public"."status" DEFAULT 'planning'::"public"."status" NOT NULL,
    "due" timestamp with time zone,
    "priority" "public"."priority" DEFAULT 'medium'::"public"."priority",
    "doc_reference" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid"
);

ALTER TABLE ONLY "public"."projects" REPLICA IDENTITY FULL;


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Projects';



COMMENT ON COLUMN "public"."projects"."name" IS 'Name';



COMMENT ON COLUMN "public"."projects"."status" IS 'Status';



COMMENT ON COLUMN "public"."projects"."due" IS 'Due date';



COMMENT ON COLUMN "public"."projects"."priority" IS 'Priority';



COMMENT ON COLUMN "public"."projects"."doc_reference" IS 'Documentation URL';



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


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "name" "text" NOT NULL,
    "status" "public"."status" DEFAULT 'planning'::"public"."status" NOT NULL,
    "due" timestamp with time zone,
    "priority" "public"."priority",
    "doc_reference" "text",
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid"
);

ALTER TABLE ONLY "public"."sections" REPLICA IDENTITY FULL;


ALTER TABLE "public"."sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."sections" IS 'Project sections';



COMMENT ON COLUMN "public"."sections"."name" IS 'Name';



COMMENT ON COLUMN "public"."sections"."status" IS 'Status';



COMMENT ON COLUMN "public"."sections"."due" IS 'Due date';



COMMENT ON COLUMN "public"."sections"."priority" IS 'Priority';



COMMENT ON COLUMN "public"."sections"."doc_reference" IS 'Documentation URL';



CREATE TABLE IF NOT EXISTS "public"."sections_sequence" (
    "section_previous" "uuid" NOT NULL,
    "section_next" "uuid" NOT NULL
);


ALTER TABLE "public"."sections_sequence" OWNER TO "postgres";


COMMENT ON TABLE "public"."sections_sequence" IS 'Pairs of sections to describe execution order';



CREATE TABLE IF NOT EXISTS "public"."task_items" (
    "description" "text" NOT NULL,
    "done" boolean DEFAULT false NOT NULL,
    "order" smallint NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    CONSTRAINT "task_items_order_check" CHECK (("order" >= 0))
);


ALTER TABLE "public"."task_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_items" IS 'Checklist for tasks';



COMMENT ON COLUMN "public"."task_items"."description" IS 'Description';



COMMENT ON COLUMN "public"."task_items"."done" IS 'If task item is completed';



COMMENT ON COLUMN "public"."task_items"."order" IS 'Order of execution';



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
    "section_id" "uuid"
);

ALTER TABLE ONLY "public"."tasks" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks" IS 'Tasks';



COMMENT ON COLUMN "public"."tasks"."name" IS 'Name';



COMMENT ON COLUMN "public"."tasks"."status" IS 'Status';



COMMENT ON COLUMN "public"."tasks"."due" IS 'Due date';



COMMENT ON COLUMN "public"."tasks"."priority" IS 'Priority';



COMMENT ON COLUMN "public"."tasks"."estimate" IS 'Estimated number of minutes for completion';



CREATE TABLE IF NOT EXISTS "public"."tasks_sequence" (
    "task_previous" "uuid" NOT NULL,
    "task_next" "uuid" NOT NULL
);


ALTER TABLE "public"."tasks_sequence" OWNER TO "postgres";


COMMENT ON TABLE "public"."tasks_sequence" IS 'Pairs of tasks to describe execution order';



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


CREATE TABLE IF NOT EXISTS "public"."work_tags" (
    "name" "text" NOT NULL,
    "synonyms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."work_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_tags" IS 'Work tags';



COMMENT ON COLUMN "public"."work_tags"."name" IS 'Tag';



COMMENT ON COLUMN "public"."work_tags"."synonyms" IS 'Array of synonyms';



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



CREATE INDEX "idx_moment_tag_entities_event" ON "public"."moment_tag_entities" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_project" ON "public"."moment_tag_entities" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_section" ON "public"."moment_tag_entities" USING "btree" ("section_id") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_moment_tag_entities_task" ON "public"."moment_tag_entities" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE INDEX "idx_moments_event" ON "public"."moments" USING "btree" ("event_id") WHERE ("event_id" IS NOT NULL);



CREATE INDEX "idx_moments_project" ON "public"."moments" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_moments_section" ON "public"."moments" USING "btree" ("section_id") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_moments_task" ON "public"."moments" USING "btree" ("task_id") WHERE ("task_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_task_logs_duration_upper_inf" ON "public"."task_logs" USING "btree" ("upper_inf"("duration")) WHERE ("upper_inf"("duration") = true);



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



CREATE OR REPLACE TRIGGER "moment_due_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_due_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_due_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_due"();



CREATE OR REPLACE TRIGGER "moment_estimate_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_estimate"();



CREATE OR REPLACE TRIGGER "moment_priority_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_priority_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_priority_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_priority"();



CREATE OR REPLACE TRIGGER "moment_scheduled_events" AFTER INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_scheduled"();



CREATE OR REPLACE TRIGGER "moment_started_task_logs" AFTER INSERT ON "public"."task_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_started"();



CREATE OR REPLACE TRIGGER "moment_status_projects" AFTER UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_status_sections" AFTER UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_status_tasks" AFTER UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_status"();



CREATE OR REPLACE TRIGGER "moment_stopped_task_logs" AFTER UPDATE ON "public"."task_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_moment_stopped"();



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



GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_fn_stop_and_start_task_log"() TO "service_role";



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







