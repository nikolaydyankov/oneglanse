"use client";

import { api } from "@/trpc/react";
import {
	Button,
	EmptyStatePanel,
	SectionHeading,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TemporaryIssueState,
	WorkspaceRequiredState,
	toast,
} from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import {
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	ListChecks,
	Loader2,
	RotateCcw,
	SearchX,
} from "lucide-react";
import { Fragment, useState } from "react";

type JobRunStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "stopped"
	| string;

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300",
	running: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
	completed:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
	failed: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
	stopped:
		"bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
	pending: "Pending",
	running: "Processing",
	completed: "Success",
	failed: "Failed",
	stopped: "Stopped",
};

const TRIGGER_LABEL: Record<string, string> = {
	scheduled: "Scheduled",
	manual: "Manual",
	retry: "Retry",
};

function StatusPill({ status }: { status: JobRunStatus }) {
	const klass =
		STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 dark:bg-neutral-800";
	const label = STATUS_LABEL[status] ?? status;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-[var(--app-radius)] px-2 py-0.5 text-xs font-medium",
				klass,
			)}
		>
			{status === "running" || status === "pending" ? (
				<Loader2 className="h-3 w-3 animate-spin" />
			) : (
				<span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
			)}
			{label}
		</span>
	);
}

function formatStartedAt(value: Date | string): string {
	const date = typeof value === "string" ? new Date(value) : value;
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

type ErrorEnvelope = {
	logs?: string[];
	error?: unknown;
};

function parseErrorEnvelope(value: unknown): ErrorEnvelope {
	if (!value || typeof value !== "object") return {};
	const v = value as Record<string, unknown>;
	const envelope: ErrorEnvelope = {};
	if (Array.isArray(v.logs) && v.logs.every((l) => typeof l === "string")) {
		envelope.logs = v.logs as string[];
	}
	if (v.error !== undefined) {
		envelope.error = v.error;
	}
	// Back-compat: if the payload doesn't look like an envelope, treat the
	// whole thing as the error blob (older rows wrote raw error objects).
	if (envelope.logs === undefined && envelope.error === undefined) {
		envelope.error = value;
	}
	return envelope;
}

function ErrorDetails({
	workspaceId,
	id,
}: {
	workspaceId: string;
	id: string;
}) {
	const { data, isLoading, error } = api.jobs.getDetails.useQuery(
		{ workspaceId, id },
		{ staleTime: 60_000 },
	);

	if (isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}
	if (error || !data) {
		return (
			<p className="text-sm text-red-600 dark:text-red-400">
				Failed to load error details.
			</p>
		);
	}

	const envelope = parseErrorEnvelope(data.errorDetails);
	const hasLogs = Array.isArray(envelope.logs) && envelope.logs.length > 0;
	const hasError = envelope.error !== undefined;

	return (
		<div className="space-y-3">
			{data.errorMessage ? (
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Error
					</p>
					<p className="mt-1 text-sm text-red-700 dark:text-red-300">
						{data.errorMessage}
					</p>
				</div>
			) : null}
			{hasLogs ? (
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Logs
					</p>
					<pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[var(--app-radius)] bg-stone-50 p-3 text-[11px] leading-relaxed text-gray-800 dark:bg-neutral-900 dark:text-gray-200">
						{(envelope.logs ?? []).join("\n")}
					</pre>
				</div>
			) : null}
			{hasError ? (
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						Details
					</p>
					<pre className="mt-1 max-h-80 overflow-auto rounded-[var(--app-radius)] bg-stone-50 p-3 text-[12px] leading-relaxed text-gray-800 dark:bg-neutral-900 dark:text-gray-200">
						{JSON.stringify(envelope.error, null, 2)}
					</pre>
				</div>
			) : null}
			{!data.errorMessage && !hasLogs && !hasError ? (
				<p className="text-sm text-muted-foreground">
					No diagnostic info recorded for this run.
				</p>
			) : null}
		</div>
	);
}

export default function JobsPageClient({
	workspaceId,
}: {
	workspaceId?: string;
}): React.JSX.Element {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const utils = api.useUtils();

	const wsId = workspaceId ?? "";
	const listQuery = api.jobs.list.useQuery(
		{ workspaceId: wsId, limit: 100 },
		{
			enabled: Boolean(wsId),
			refetchInterval: (q) => {
				const rows = q.state.data;
				if (!rows) return false;
				return rows.some(
					(r) => r.status === "pending" || r.status === "running",
				)
					? 2000
					: false;
			},
		},
	);

	const retryMutation = api.jobs.retry.useMutation({
		onSuccess: async (result) => {
			if (result.status === "queued") {
				toast.success("Retry queued");
			} else if (result.status === "empty") {
				toast.error("Cannot retry — no prompts in this workspace.");
			} else if (result.status === "no-providers") {
				toast.error("Cannot retry — providers are not connected.");
			}
			await utils.jobs.list.invalidate({ workspaceId: wsId });
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});

	if (!workspaceId) {
		return (
			<WorkspaceRequiredState
				icon={SearchX}
				title="Pick a Workspace"
				description="Open a workspace to see its job history."
			/>
		);
	}

	if (listQuery.isLoading && !listQuery.data) {
		return (
			<div className="web-page-wide">
				<div className="web-page-wide-inner space-y-4">
					<Skeleton className="h-10 w-56" />
					<Skeleton className="h-[480px] rounded-[var(--app-radius)]" />
				</div>
			</div>
		);
	}

	if (listQuery.error) {
		return (
			<TemporaryIssueState
				icon={AlertTriangle}
				title="Jobs Are Unavailable"
				description="We couldn’t load job history right now."
			/>
		);
	}

	const rows = listQuery.data ?? [];

	return (
		<div className="web-page-wide">
			<div className="web-page-wide-inner ui-stagger space-y-6 sm:space-y-8">
				<SectionHeading
					as="h2"
					title="Job history"
					description="Each scheduled and manual prompt run, tracked per provider with status and error details."
					titleClassName="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100"
					descriptionClassName="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400"
				/>

				{rows.length === 0 ? (
					<EmptyStatePanel
						icon={ListChecks}
						title="No runs yet"
						description="Runs appear here when the schedule fires or when you trigger one from the Schedule page."
					/>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-8" />
								<TableHead>Started</TableHead>
								<TableHead>Trigger</TableHead>
								<TableHead>Provider</TableHead>
								<TableHead className="text-right">Prompts</TableHead>
								<TableHead className="text-right">Responses</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row) => {
								const isExpanded = expandedId === row.id;
								const canRetry =
									row.status === "failed" || row.status === "stopped";
								const isRetrying =
									retryMutation.isPending &&
									retryMutation.variables?.jobGroupId === row.jobGroupId;

								return (
									<Fragment key={row.id}>
										<TableRow
											className="cursor-pointer"
											onClick={() => setExpandedId(isExpanded ? null : row.id)}
										>
											<TableCell>
												{isExpanded ? (
													<ChevronDown className="h-4 w-4 text-muted-foreground" />
												) : (
													<ChevronRight className="h-4 w-4 text-muted-foreground" />
												)}
											</TableCell>
											<TableCell className="text-sm">
												{formatStartedAt(row.startedAt)}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{TRIGGER_LABEL[row.trigger] ?? row.trigger}
											</TableCell>
											<TableCell className="text-sm font-medium capitalize">
												{row.provider}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{row.promptCount}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{row.responseCount ?? "—"}
											</TableCell>
											<TableCell>
												<StatusPill status={row.status} />
											</TableCell>
											<TableCell
												className="text-right"
												onClick={(e) => e.stopPropagation()}
											>
												{canRetry ? (
													<Button
														variant="outline"
														size="sm"
														disabled={retryMutation.isPending}
														onClick={() =>
															retryMutation.mutate({
																workspaceId: wsId,
																jobGroupId: row.jobGroupId,
															})
														}
													>
														{isRetrying ? (
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
														) : (
															<RotateCcw className="h-3.5 w-3.5" />
														)}
														Retry
													</Button>
												) : null}
											</TableCell>
										</TableRow>
										{isExpanded ? (
											<TableRow>
												<TableCell
													colSpan={8}
													className="bg-stone-50/60 dark:bg-neutral-900/60"
												>
													<ErrorDetails workspaceId={wsId} id={row.id} />
												</TableCell>
											</TableRow>
										) : null}
									</Fragment>
								);
							})}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
