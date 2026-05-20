export async function register() {
	// Only run in the Node.js runtime (not edge), once on server boot.
	if (process.env.NEXT_RUNTIME === "nodejs") {
		const { configureSchedulerSecrets, ensureJobRunsRetentionSchedule } =
			await import("@oneglanse/services");
		await configureSchedulerSecrets();
		await ensureJobRunsRetentionSchedule();
	}
}
