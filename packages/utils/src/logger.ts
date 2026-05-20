const DEBUG_ENABLED =
	process.env["DEBUG_ENABLED"] === "true" ||
	process.env["DEBUG_ENABLED"] === "1";

// ── Provider context hook ─────────────────────────────────────────────────────
// Logger is browser-safe: it never imports node:async_hooks.
// The agent runtime installs a getter via setProviderContextGetter() at startup;
// web app code leaves it unset and contextPrefix() returns an empty string.

let _getContext: (() => string | undefined) | null = null;

/** Call once at agent startup to wire AsyncLocalStorage into the logger. */
export function setProviderContextGetter(fn: () => string | undefined): void {
	_getContext = fn;
}

// ── Log sink hook ─────────────────────────────────────────────────────────────
// Agent runtime installs a sink via setLogSink() to mirror log lines into a
// per-job buffer for persistence. The web app leaves it unset.

let _logSink: ((line: string) => void) | null = null;

export function setLogSink(fn: ((line: string) => void) | null): void {
	_logSink = fn;
}

const ESC_BYTE = String.fromCharCode(0x1b);
const ANSI_RE = new RegExp(`${ESC_BYTE}\\[[0-9;]*m`, "g");

function stripAnsi(value: string): string {
	return value.replace(ANSI_RE, "");
}

function stringifyArg(arg: unknown): string {
	if (typeof arg === "string") return arg;
	if (arg instanceof Error) return arg.stack || arg.message;
	try {
		return JSON.stringify(arg);
	} catch {
		return String(arg);
	}
}

function emitToSink(prefix: string, args: unknown[]): void {
	if (!_logSink) return;
	const cleanPrefix = stripAnsi(prefix).trim();
	const body = args.map((a) => stripAnsi(stringifyArg(a))).join(" ");
	const line = cleanPrefix ? `${cleanPrefix} ${body}` : body;
	_logSink(line);
}

// ── ANSI helpers ──────────────────────────────────────────────────────────────

const R = "\x1b[0m";
const DIM = "\x1b[2m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const BOLD = "\x1b[1m";

const PROVIDER_COLORS: Record<string, string> = {
	chatgpt: "\x1b[32m",
	perplexity: "\x1b[36m",
	gemini: "\x1b[33m",
	claude: "\x1b[35m",
	"ai-overview": "\x1b[34m",
};

const RAW_PROVIDER_LABELS: Record<string, string> = {
	chatgpt: "CHATGPT",
	perplexity: "PERPLEXITY",
	gemini: "GEMINI",
	claude: "CLAUDE",
	"ai-overview": "AI OVERVIEW",
};

function centerLabel(label: string, width: number): string {
	const totalPadding = width - label.length;
	if (totalPadding <= 0) return label;

	const left = Math.floor(totalPadding / 2);
	const right = totalPadding - left;

	return " ".repeat(left) + label + " ".repeat(right);
}

export const PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
	Object.entries(RAW_PROVIDER_LABELS).map(([key, label]) => [
		key,
		centerLabel(label, 12),
	]),
);

function coloredPrefix(provider: string): string {
	const color = PROVIDER_COLORS[provider] ?? "\x1b[37m";
	const label =
		PROVIDER_LABELS[provider] ?? provider.toUpperCase().slice(0, 11).padEnd(11);
	return `${BOLD}${color}[${label}]${R}`;
}

function contextPrefix(): string {
	const provider = _getContext?.();
	return provider ? `${coloredPrefix(provider)} ` : "";
}

function formatArgs(args: unknown[]) {
	return args.map((arg) =>
		arg instanceof Error ? arg.stack || arg.message : arg,
	);
}

function ts(): string {
	return new Date().toISOString();
}

// ── Global logger ─────────────────────────────────────────────────────────────

export const logger = {
	log: (...args: unknown[]) => {
		const prefix = `${ts()} ${contextPrefix()}`;
		console.log(prefix, ...formatArgs(args));
		emitToSink(prefix, args);
	},

	warn: (...args: unknown[]) => {
		const prefix = `${ts()} ${contextPrefix()} ${YELLOW}⚠${R}`;
		console.warn(prefix, ...formatArgs(args));
		emitToSink(prefix, args);
	},

	error: (...args: unknown[]) => {
		const prefix = `${ts()} ${contextPrefix()} ${RED}✕${R}`;
		console.error(prefix, ...formatArgs(args));
		emitToSink(prefix, args);
	},

	success: (...args: unknown[]) => {
		const prefix = `${ts()} ${contextPrefix()} ${GREEN}✓${R}`;
		console.log(prefix, ...formatArgs(args));
		emitToSink(prefix, args);
	},

	debug: (...args: unknown[]) => {
		if (!DEBUG_ENABLED) return;
		const prefix = `${ts()} ${DIM}${contextPrefix()}${R}`;
		console.log(prefix, ...formatArgs(args));
		emitToSink(prefix, args);
	},
};

// ── Provider-colored logger ───────────────────────────────────────────────────
// Kept for explicit use-cases (e.g. BullMQ event handlers that run outside the
// provider async context).

export type ProviderLogger = typeof logger;
export function createProviderLogger(provider: string): ProviderLogger {
	const prefix = coloredPrefix(provider);

	return {
		log: (...args) => {
			const head = `${ts()} ${prefix}`;
			console.log(head, ...formatArgs(args));
			emitToSink(head, args);
		},

		warn: (...args) => {
			const head = `${ts()} ${prefix} ${YELLOW}⚠${R}`;
			console.warn(head, ...formatArgs(args));
			emitToSink(head, args);
		},

		error: (...args) => {
			const head = `${ts()} ${prefix} ${RED}✕${R}`;
			console.error(head, ...formatArgs(args));
			emitToSink(head, args);
		},

		success: (...args) => {
			const head = `${ts()} ${prefix} ${GREEN}✓${R}`;
			console.log(head, ...formatArgs(args));
			emitToSink(head, args);
		},

		debug: (...args) => {
			if (!DEBUG_ENABLED) return;
			const head = `${ts()} ${DIM}${prefix}${R}`;
			console.log(head, ...formatArgs(args));
			emitToSink(head, args);
		},
	};
}
