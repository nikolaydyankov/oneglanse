import { clickhouse, db, schema } from "@oneglanse/db";
import { eq } from "drizzle-orm";

/**
 * Clears all data produced by prompt runs for a workspace:
 * - ClickHouse `analytics.prompt_responses` (raw provider responses)
 * - ClickHouse `analytics.prompt_analysis` (derived brand analysis)
 * - Postgres `job_runs` (run history)
 *
 * Preserves prompts (`analytics.user_prompts`), workspace settings, and auth.
 */
export async function clearWorkspaceJobData(args: {
	workspaceId: string;
}): Promise<void> {
	const { workspaceId } = args;

	await clickhouse.command({
		query: `
            ALTER TABLE analytics.prompt_analysis
            DELETE WHERE workspace_id = {workspaceId:String}
        `,
		query_params: { workspaceId },
	});

	await clickhouse.command({
		query: `
            ALTER TABLE analytics.prompt_responses
            DELETE WHERE workspace_id = {workspaceId:String}
        `,
		query_params: { workspaceId },
	});

	await db
		.delete(schema.jobRuns)
		.where(eq(schema.jobRuns.workspaceId, workspaceId));
}
