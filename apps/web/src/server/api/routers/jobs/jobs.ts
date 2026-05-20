import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import { schema } from "@oneglanse/db";
import { ValidationError } from "@oneglanse/errors";
import { clearWorkspaceJobData, submitAgentJobGroup } from "@oneglanse/services";
import type { Provider } from "@oneglanse/types";
import { PROVIDER_LIST } from "@oneglanse/types";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { authorizedWorkspaceProcedure } from "../../procedures";

const listInputSchema = z.object({
	workspaceId: z.string(),
	limit: z.number().int().min(1).max(200).default(100),
});

const getDetailsInputSchema = z.object({
	workspaceId: z.string(),
	id: z.string().uuid(),
});

const retryInputSchema = z.object({
	workspaceId: z.string(),
	jobGroupId: z.string().uuid(),
});

const clearAllInputSchema = z.object({
	workspaceId: z.string(),
});

export const jobsRouter = createTRPCRouter({
	list: authorizedWorkspaceProcedure
		.input(listInputSchema)
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					id: schema.jobRuns.id,
					jobGroupId: schema.jobRuns.jobGroupId,
					provider: schema.jobRuns.provider,
					trigger: schema.jobRuns.trigger,
					status: schema.jobRuns.status,
					promptCount: schema.jobRuns.promptCount,
					responseCount: schema.jobRuns.responseCount,
					errorMessage: schema.jobRuns.errorMessage,
					startedAt: schema.jobRuns.startedAt,
					completedAt: schema.jobRuns.completedAt,
				})
				.from(schema.jobRuns)
				.where(eq(schema.jobRuns.workspaceId, input.workspaceId))
				.orderBy(schema.jobRuns.startedAt)
				.limit(input.limit);

			return rows.reverse();
		}),

	getDetails: authorizedWorkspaceProcedure
		.input(getDetailsInputSchema)
		.query(async ({ ctx, input }) => {
			const row = await ctx.db.query.jobRuns.findFirst({
				where: (jr, { and: a, eq: e }) =>
					a(e(jr.id, input.id), e(jr.workspaceId, input.workspaceId)),
			});

			if (!row) {
				throw new ValidationError("Job run not found.");
			}

			return row;
		}),

	retry: authorizedWorkspaceProcedure
		.input(retryInputSchema)
		.mutation(async ({ ctx, input }) => {
			const failedRows = await ctx.db
				.select({ provider: schema.jobRuns.provider })
				.from(schema.jobRuns)
				.where(
					and(
						eq(schema.jobRuns.jobGroupId, input.jobGroupId),
						eq(schema.jobRuns.workspaceId, input.workspaceId),
						inArray(schema.jobRuns.status, ["failed", "stopped"]),
					),
				);

			const providerSet = new Set<Provider>();
			const validProviders = new Set<string>(PROVIDER_LIST);
			for (const row of failedRows) {
				if (validProviders.has(row.provider)) {
					providerSet.add(row.provider as Provider);
				}
			}

			if (providerSet.size === 0) {
				throw new ValidationError("No failed providers to retry in this job.");
			}

			const result = await submitAgentJobGroup({
				workspaceId: input.workspaceId,
				userId: ctx.user.id,
				trigger: "retry",
				providerFilter: [...providerSet],
			});

			if (result.status === "queued") {
				await ctx.db
					.delete(schema.jobRuns)
					.where(
						and(
							eq(schema.jobRuns.jobGroupId, input.jobGroupId),
							eq(schema.jobRuns.workspaceId, input.workspaceId),
							inArray(schema.jobRuns.status, ["failed", "stopped"]),
						),
					);
			}

			return result;
		}),

	clearAll: authorizedWorkspaceProcedure
		.input(clearAllInputSchema)
		.mutation(async ({ input }) => {
			await clearWorkspaceJobData({ workspaceId: input.workspaceId });
			return { status: "cleared" as const };
		}),
});
