import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const jobRuns = pgTable(
	"job_runs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		jobGroupId: uuid("job_group_id").notNull(),
		workspaceId: text("workspace_id").notNull(),
		userId: text("user_id").notNull(),
		provider: varchar("provider", { length: 32 }).notNull(),
		trigger: varchar("trigger", { length: 16 }).notNull(),
		status: varchar("status", { length: 16 }).notNull(),
		promptCount: integer("prompt_count").notNull(),
		responseCount: integer("response_count"),
		errorMessage: text("error_message"),
		errorDetails: jsonb("error_details"),
		startedAt: timestamp("started_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => ({
		workspaceStartedIdx: index("job_runs_workspace_started_idx").on(
			table.workspaceId,
			table.startedAt,
		),
		groupIdx: index("job_runs_group_idx").on(table.jobGroupId),
	}),
);
