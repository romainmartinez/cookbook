// Local copy of github.com/johnlindquist/pi-emphasis (MIT, see LICENSE), trimmed to rendering only.
// The reply-style rules live in pi/AGENTS.md so the startup dashboard counts them.
//
//   **anchor term**   bold keeps its weight and takes the link color
//   ✓ / ✗             take the success and error colors
//   [[Blocked]]       becomes a rounded status pill colored by its word, with that word's icon
//
// Stored messages, copied text, and HTML exports keep the original Markdown.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Colorize = (text: string) => string;
export type PillTone = "success" | "error" | "warning" | "danger" | "neutral";

export interface Palette {
	bold: Colorize;
	passed: Colorize;
	failed: Colorize;
	arrow: Colorize;
	tree: Colorize;
	/** Opening escapes for each pill tone: label colors and the cap color. */
	pills: Record<PillTone, { label: string; cap: string }>;
}

/** Minimal slice of Pi's Theme used to build a palette. */
export interface ThemeLike {
	fg(color: never, text: string): string;
	getFgAnsi(color: never): string;
	getBgAnsi(color: never): string;
}

/** The pill words agents are told to write, by tone. Any other word renders neutral. */
export const VOCABULARY: Record<Exclude<PillTone, "neutral">, string[]> = {
	error: ["Failed", "Blocked", "Broken", "Unsafe"],
	warning: ["Needs you", "Decision", "Unverified", "Partial", "Skipped", "In progress", "Pending", "At risk"],
	success: ["Done", "Passed", "Observed", "Fixed", "Live", "Recommended", "Keep"],
	danger: ["Costs money", "Destructive", "Irreversible"],
};

// Font Awesome glyphs from the Nerd Font set: one cell wide in every terminal.
const PILL_ICONS: Record<string, string> = {
	done: "\uf00c", passed: "\uf00c", observed: "\uf06e", fixed: "\uf0ad", live: "\uf135", recommended: "\uf005", keep: "\uf08d",
	failed: "\uf00d", blocked: "\uf05e", broken: "\uf127", unsafe: "\uf132",
	"needs you": "\uf007", decision: "\uf126", unverified: "\uf128", partial: "\uf042", skipped: "\uf04e",
	"in progress": "\uf110", pending: "\uf017", "at risk": "\uf071",
	"costs money": "\uf155", destructive: "\uf1f8", irreversible: "\uf023",
	inferred: "\uf0eb", new: "\uf067", changed: "\uf040", optional: "\uf10c",
};

/** The icon a heading or a line's leading bold label takes from its word. */
const LABEL_ICONS: Record<string, string> = {
	finding: "\uf002", cause: "\uf0e7", fix: "\uf0ad", result: "\uf11e", next: "\uf061",
	risk: "\uf071", options: "\uf0ca", verdict: "\uf0e3", plan: "\uf0ae", status: "\uf012",
};

/** Action lead-ins. With a colon they take an icon anywhere in a line. */
const ACTION_ICONS: Record<string, string> = {
	check: "\uf046", do: "\uf0a4", next: "\uf061", unblock: "\uf09c", left: "\uf141", run: "\uf04b", guard: "\uf132", undo: "\uf0e2", see: "\uf08e",
};

// A label may open with its own Private Use Area glyph, which wins over the table's icon.
const OWN_ICON = /^\s*([\ue000-\uf8ff]|[\u{f0000}-\u{ffffd}])\s*/u;

const TONES = Object.fromEntries(
	Object.entries(VOCABULARY).flatMap(([tone, words]) => words.map((w) => [w.toLowerCase(), tone as PillTone])),
) as Record<string, PillTone>;
const KNOWN = Object.keys(PILL_ICONS).sort((a, b) => b.length - a.length);

/** A pill label read as its word: a known word may be followed by detail ("Passed 12/12", "Failed: 3 tests"). */
function splitLabel(label: string): { icon: string | undefined; word: string; key: string } {
	const own = label.match(OWN_ICON);
	const word = (own ? label.slice(own[0].length) : label).replace(/\s+/g, " ").trim();
	const lower = word.toLowerCase();
	const key = KNOWN.find((k) => lower === k || (lower.startsWith(k) && /[ :]/.test(lower[k.length]))) ?? lower;
	return { icon: own?.[1] ?? PILL_ICONS[key], word, key };
}

export function toneOf(label: string): PillTone {
	return TONES[splitLabel(label).key] ?? "neutral";
}

/** A background escape turned into the same color as a foreground, for pill caps. */
function bgToFg(bg: string): string {
	return bg.replace(/\x1b\[48;/g, "\x1b[38;").replace(/\x1b\[(4|10)([0-7])m/g, (_, p: string, n: string) => `\x1b[${p === "4" ? "3" : "9"}${n}m`);
}

export function createPalette(theme: ThemeLike): Palette {
	const fg = (name: string) => (text: string) => theme.fg(name as never, text);
	const tone = (labelFg: string, bg: string) => {
		const bgAnsi = theme.getBgAnsi(bg as never);
		// A theme without its own panel colors (Pi's system theme when the terminal reports
		// none) draws pills in reverse video: the tone's color becomes the background.
		if (!bgAnsi || /^\x1b\[49m$/.test(bgAnsi)) {
			const fgAnsi = theme.getFgAnsi((labelFg === "text" ? "accent" : labelFg) as never);
			return { label: `${fgAnsi}\x1b[7m`, cap: fgAnsi };
		}
		return { label: bgAnsi + theme.getFgAnsi(labelFg as never), cap: bgToFg(bgAnsi) };
	};
	return {
		bold: fg("mdLink"),
		passed: fg("success"),
		failed: fg("error"),
		arrow: fg("accent"),
		tree: fg("dim"),
		pills: {
			success: tone("success", "toolSuccessBg"),
			error: tone("error", "toolErrorBg"),
			warning: tone("warning", "searchMatchBg"),
			neutral: tone("text", "selectedBg"),
			// A solid chip in the terminal's own red: louder than the panel-colored tones.
			danger: { label: "\x1b[31m\x1b[7m", cap: "\x1b[31m" },
		},
	};
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
// Escaped bold markers, bold markers, a [[pill]] of 1-32 characters, or a colored symbol.
const INLINE = /(\\*)(\*\*|__)|\[\[([^\[\]\n]{1,32})\]\]|([✓✔✗✘→]|[├└]──)/g;
const ACTION_LABEL = new RegExp(`(\\*\\*)(${Object.keys(ACTION_ICONS).join("|")})(:\\*\\*)`, "gi");
// A line's leading bold label, after an optional list marker or tree connector.
const LEAD_LABEL = /^(\s*(?:[-*+]|\d+\.)?\s*(?:[├└]──\s*)?\*\*)([^*`\n]{1,32})(\*\*)/;

/** Apply colors to assistant Markdown, leaving code blocks, inline code and headings alone. */
export function decorate(markdown: string, palette: Palette): string {
	const [open, close] = palette.bold("\u0000").split("\u0000") as [string, string];
	const out: string[] = [];
	let fence: string | undefined;
	for (const line of markdown.split("\n")) {
		const fenceMatch = line.match(FENCE);
		if (fence) {
			if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = undefined;
			out.push(line);
		} else if (fenceMatch) {
			fence = fenceMatch[1];
			out.push(line);
		} else if (/^ {0,3}#{1,6}\s/.test(line)) {
			out.push(line.replace(/^( {0,3}#{1,6}\s+)(.+)$/, (_, hashes: string, title: string) => hashes + withLabelIcon(title))); // Pi already colors headings.
		} else {
			out.push(decorateLine(line, palette, open, close));
		}
	}
	return out.join("\n");
}

/** Prefix a known label with its icon, unless it already opens with a glyph. */
function withLabelIcon(label: string): string {
	if (OWN_ICON.test(label)) return label;
	const word = label.replace(/[:\s]+$/, "").trim().toLowerCase();
	const icon = LABEL_ICONS[word] ?? (label.trimEnd().endsWith(":") ? ACTION_ICONS[word] : undefined);
	return icon ? `${icon} ${label}` : label;
}

function pill(label: string, palette: Palette): string {
	const style = palette.pills[toneOf(label)];
	const { icon, word } = splitLabel(label);
	// No-break spaces keep a two-word pill on one line when Pi wraps the paragraph.
	const text = (icon && word ? `${icon} ${word}` : word || label.trim()).replace(/ /g, "\u00a0");
	return `${style.cap}\ue0b6\x1b[39m${style.label}\x1b[1m${text}\x1b[22;27m\x1b[39m\x1b[49m${style.cap}\ue0b4\x1b[39m`;
}

function decorateLine(line: string, palette: Palette, open: string, close: string): string {
	// Odd parts are inline code spans, which stay untouched.
	const parts = line.replace(LEAD_LABEL, (_, before: string, label: string, after: string) => before + withLabelIcon(label) + after).split(/(`+[^`]*?`+)/g);
	let result = "";
	let inBold: string | undefined;
	const symbolColor = (symbol: string) =>
		/[✓✔]/.test(symbol) ? palette.passed
		: /[✗✘]/.test(symbol) ? palette.failed
		: symbol === "→" ? palette.arrow
		: palette.tree;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (i % 2 === 1) {
			// Pi's code color ends with a foreground reset; restore the bold color after it.
			result += inBold ? `${part}${open}` : part;
			continue;
		}
		const prose = part.replace(ACTION_LABEL, (_, before: string, word: string, after: string) => `${before}${ACTION_ICONS[word.toLowerCase()]} ${word}${after}`);
		// One pass, so bold state is current at each symbol and colored symbols cannot split a pill.
		result += prose.replace(INLINE, (match, slashes: string | undefined, marker: string | undefined, label: string | undefined, symbol: string | undefined) => {
			if (symbol !== undefined) return symbolColor(symbol)(symbol) + (inBold ? open : "");
			if (label !== undefined) {
				if (!label.trim()) return match;
				return pill(label, palette) + (inBold ? `\x1b[1m${open}` : "");
			}
			if ((slashes ?? "").length % 2 === 1) return match; // escaped marker
			if (!inBold) {
				inBold = marker;
				return `${slashes}${marker}${open}`;
			}
			if (inBold === marker) {
				inBold = undefined;
				return `${slashes}${close}${marker}`;
			}
			return match;
		});
	}
	// An unclosed span (streaming or literal asterisks) ends its color at the line end.
	if (inBold) result += close;
	return result;
}

export default function emphasis(pi: ExtensionAPI) {
	let currentTheme: (() => ThemeLike) | undefined;
	let built: { theme: ThemeLike; palette: Palette } | undefined;
	pi.on("session_start", (_event, ctx) => {
		if (ctx.mode !== "tui") return;
		currentTheme = () => ctx.ui.theme as unknown as ThemeLike;
	});
	pi.registerMarkdownTransformer((markdown, context) => {
		if (!currentTheme || context.messageType !== "assistant") return markdown;
		const theme = currentTheme();
		if (built?.theme !== theme) built = { theme, palette: createPalette(theme) };
		return decorate(markdown, built.palette);
	});
}
