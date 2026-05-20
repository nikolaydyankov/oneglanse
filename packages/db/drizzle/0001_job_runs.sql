CREATE TABLE "job_runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "job_group_id" uuid NOT NULL,
    "workspace_id" text NOT NULL,
    "user_id" text NOT NULL,
    "provider" varchar(32) NOT NULL,
    "trigger" varchar(16) NOT NULL,
    "status" varchar(16) NOT NULL,
    "prompt_count" integer NOT NULL,
    "response_count" integer,
    "error_message" text,
    "error_details" jsonb,
    "started_at" timestamptz NOT NULL DEFAULT now(),
    "completed_at" timestamptz
);

CREATE INDEX "job_runs_workspace_started_idx" ON "public"."job_runs" ("workspace_id", "started_at");
CREATE INDEX "job_runs_group_idx" ON "public"."job_runs" ("job_group_id");
