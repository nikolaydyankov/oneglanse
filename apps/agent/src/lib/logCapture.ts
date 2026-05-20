/**
 * Agent-only log capture using AsyncLocalStorage.
 *
 * Mirrors the providerContext.ts pattern: node:async_hooks lives here (agent
 * only), and the shared utils package exposes a hook (setLogSink) we register
 * at import time. Inside withLogCapture(fn), every logger.* / plog.* call also
 * pushes a clean (ANSI-stripped) line into a per-run ring buffer.
 *
 * The captured lines are persisted into job_runs.errorDetails so the Jobs page
 * UI can display the worker's stdout trail.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { setLogSink } from "@oneglanse/utils";

type CaptureBuffer = { lines: string[]; bytes: number };

const MAX_LINES = 250;
const MAX_BYTES = 32 * 1024;

const storage = new AsyncLocalStorage<CaptureBuffer>();

setLogSink((line) => {
	const buf = storage.getStore();
	if (!buf) return;
	const bytes = Buffer.byteLength(line, "utf8");
	buf.lines.push(line);
	buf.bytes += bytes;
	while (
		buf.lines.length > 0 &&
		(buf.lines.length > MAX_LINES || buf.bytes > MAX_BYTES)
	) {
		const dropped = buf.lines.shift();
		if (dropped !== undefined) {
			buf.bytes -= Buffer.byteLength(dropped, "utf8");
		}
	}
});

export type LogCaptureResult<T> =
	| { status: "ok"; result: T; lines: string[] }
	| { status: "error"; error: unknown; lines: string[] };

/**
 * Runs `fn` inside a fresh capture buffer. Always returns the captured lines —
 * including the lines emitted before a thrown error — so callers can persist
 * them regardless of outcome. The error is returned (not thrown) so the
 * caller controls re-throwing after consuming the lines.
 */
export async function withLogCapture<T>(
	fn: () => Promise<T>,
): Promise<LogCaptureResult<T>> {
	const buf: CaptureBuffer = { lines: [], bytes: 0 };
	try {
		const result = await storage.run(buf, fn);
		return { status: "ok", result, lines: buf.lines };
	} catch (error) {
		return { status: "error", error, lines: buf.lines };
	}
}
