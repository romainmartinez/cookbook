import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = [
  "usage: node memories.ts <command> [options]",
  "  list [--since YYYY-MM-DD|15d|2w] [--all] [--limit 150]   prompts since the last mark (default window: 14 days)",
  "  mark                                              record now as the last review for this project",
  "  dismiss <text>...                                 never suggest these rules again for this project",
].join("\n");

const DEFAULT_DAYS = 14;
const PROMPT_MAX = 1500;
const REPLY_MAX = 500;

export interface Exchange {
  session: string;
  time: number;
  reply: string;
  prompt: string;
}

interface ProjectState {
  lastReview?: number;
  dismissed?: string[];
}

type State = Record<string, ProjectState>;

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

function clip(text: string, max: number, keep: "start" | "end"): string {
  if (text.length <= max) return text;
  return keep === "start" ? `${text.slice(0, max)}…` : `…${text.slice(-max)}`;
}

export function templatePrefixes(templates: string[]): string[] {
  return templates
    .map((source) => source.replace(/^---\n[\s\S]*?\n---\n/, ""))
    .map((body) => body.split("$")[0].trim().slice(0, 80))
    .filter((prefix) => prefix.length >= 12);
}

export function isExpandedTemplate(prompt: string, prefixes: string[]): boolean {
  const text = prompt.trim();
  return text.startsWith("<skill") || prefixes.some((prefix) => text.startsWith(prefix));
}

export function exchanges(jsonl: string, session: string, since: number, prefixes: string[]): Exchange[] {
  const out: Exchange[] = [];
  let reply = "";
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.type !== "message") continue;
    const { role, content, timestamp } = entry.message ?? {};
    if (role === "assistant") {
      const text = textOf(content).trim();
      if (text) reply = text;
      continue;
    }
    if (role !== "user") continue;
    const prompt = textOf(content).trim();
    const time = typeof timestamp === "number" ? timestamp : Date.parse(entry.timestamp);
    if (prompt && time > since && !isExpandedTemplate(prompt, prefixes)) {
      out.push({ session, time, reply: clip(reply, REPLY_MAX, "end"), prompt: clip(prompt, PROMPT_MAX, "start") });
    }
    reply = "";
  }
  return out;
}

export function dedupe(items: Exchange[]): Exchange[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.time}\u0000${item.prompt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const UNIT_DAYS: Record<string, number> = { d: 1, day: 1, days: 1, w: 7, week: 7, weeks: 7 };

export function parseSince(value: string, now = Date.now()): number {
  const relative = /^(\d+)\s*([a-z]+)$/i.exec(value.trim());
  const days = relative && UNIT_DAYS[relative[2].toLowerCase()];
  if (relative && days) return now - Number(relative[1]) * days * 86_400_000;
  const date = Date.parse(value);
  if (Number.isNaN(date)) throw new Error("--since must be a date like 2026-11-01 or a duration like 15d, 15 days, or 2w");
  return date;
}

export function belongsTo(cwd: unknown, root: string): boolean {
  return typeof cwd === "string" && (cwd === root || cwd.startsWith(`${root}/`));
}

function projectRoot(cwd: string): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return cwd;
  }
}

function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
}

function statePath(): string {
  return join(agentDir(), "memories", "state.json");
}

function readState(): State {
  try {
    return JSON.parse(readFileSync(statePath(), "utf8"));
  } catch {
    return {};
  }
}

function writeState(state: State): void {
  mkdirSync(dirname(statePath()), { recursive: true });
  writeFileSync(statePath(), `${JSON.stringify(state, null, 2)}\n`);
}

function readTemplates(): string[] {
  const dirs = [join(agentDir(), "prompts"), dirname(fileURLToPath(import.meta.url))];
  const sources = new Set<string>();
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".md")) sources.add(readFileSync(join(dir, name), "utf8"));
    }
  }
  return [...sources];
}

function firstLine(file: string): string {
  const text = readFileSync(file, "utf8");
  const end = text.indexOf("\n");
  return end < 0 ? text : text.slice(0, end);
}

function list(root: string, opts: Record<string, string | true>, args: string[]): object {
  const state = readState()[root] ?? {};
  const limit = Number(opts.limit ?? 150);
  if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit must be a positive integer");
  let since = state.lastReview ?? Date.now() - DEFAULT_DAYS * 86_400_000;
  if (opts.all) since = 0;
  if (typeof opts.since === "string") {
    const unit = /^\d+$/.test(opts.since) && args[0] && args[0].toLowerCase() in UNIT_DAYS ? ` ${args[0]}` : "";
    since = parseSince(opts.since + unit);
  } else if (opts.since) {
    throw new Error("--since needs a value");
  }

  const prefixes = templatePrefixes(readTemplates());
  const sessionsDir = join(agentDir(), "sessions");
  const found: Exchange[] = [];
  let sessions = 0;
  for (const dir of existsSync(sessionsDir) ? readdirSync(sessionsDir) : []) {
    const full = join(sessionsDir, dir);
    for (const name of readdirSync(full).filter((file) => file.endsWith(".jsonl"))) {
      const file = join(full, name);
      let header;
      try {
        header = JSON.parse(firstLine(file));
      } catch {
        continue;
      }
      if (!belongsTo(header.cwd, root)) continue;
      const items = exchanges(readFileSync(file, "utf8"), file, since, prefixes);
      if (items.length) sessions++;
      found.push(...items);
    }
  }

  const messages = dedupe(found).sort((a, b) => a.time - b.time).slice(-limit);
  return {
    root,
    since: since ? new Date(since).toISOString() : null,
    sessions,
    total: messages.length,
    dismissed: state.dismissed ?? [],
    messages: messages.map((item) => ({ ...item, time: new Date(item.time).toISOString() })),
  };
}

function parseArgs(rest: string[]) {
  const opts: Record<string, string | true> = {};
  const args: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith("--")) {
      args.push(rest[i]);
      continue;
    }
    const next = rest[i + 1];
    opts[rest[i].slice(2)] = next === undefined || next.startsWith("--") ? true : rest[++i];
  }
  return { opts, args };
}

function main(argv: string[]): void {
  const [cmd, ...rest] = argv;
  const { opts, args } = parseArgs(rest);
  const root = projectRoot(process.cwd());
  if (cmd === "list") {
    console.log(JSON.stringify(list(root, opts, args), null, 2));
  } else if (cmd === "mark") {
    const state = readState();
    state[root] = { ...state[root], lastReview: Date.now() };
    writeState(state);
    console.log(JSON.stringify({ root, lastReview: new Date(state[root].lastReview!).toISOString() }));
  } else if (cmd === "dismiss" && args.length) {
    const state = readState();
    const dismissed = new Set([...(state[root]?.dismissed ?? []), ...args]);
    state[root] = { ...state[root], dismissed: [...dismissed] };
    writeState(state);
    console.log(JSON.stringify({ root, dismissed: state[root].dismissed }));
  } else {
    console.error(USAGE);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
