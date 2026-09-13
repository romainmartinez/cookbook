import { readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, normalize, resolve } from "node:path";

export const DIMENSIONS = ["project", "provider", "model", "session", "day", "week", "month"] as const;
export type Dimension = typeof DIMENSIONS[number];
export type IdentityDimension = "project" | "provider" | "model" | "session";
export type CalendarDimension = "day" | "week" | "month";
export type CostFields = { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
export type Metrics = CostFields & {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  sessions: Set<string>;
  operations: number;
};
export type UsageRecord = {
  entryId: string;
  timestamp: Date;
  project: string;
  provider: string;
  model: string;
  session: string;
  sessionId: string;
  cost: CostFields;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};
export type Diagnostic = { file: string; line?: number; message: string };
export type Snapshot = {
  records: UsageRecord[];
  diagnostics: Diagnostic[];
  values: Record<IdentityDimension, string[]>;
  files: number;
};

type RawSession = {
  file: string;
  header: Record<string, unknown>;
  entries: Array<{ value: Record<string, unknown>; line: number }>;
  label: string;
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function usageOf(value: unknown): { cost: CostFields; totalTokens: number; input: number; output: number; cacheRead: number; cacheWrite: number } | undefined {
  if (!object(value) || !object(value.cost)) return undefined;
  const numbers = [value.totalTokens, value.input, value.output, value.cacheRead, value.cacheWrite,
    value.cost.input, value.cost.output, value.cost.cacheRead, value.cost.cacheWrite, value.cost.total];
  if (!numbers.every(finite)) return undefined;
  return {
    totalTokens: value.totalTokens as number,
    input: value.input as number,
    output: value.output as number,
    cacheRead: value.cacheRead as number,
    cacheWrite: value.cacheWrite as number,
    cost: {
      input: value.cost.input as number,
      output: value.cost.output as number,
      cacheRead: value.cost.cacheRead as number,
      cacheWrite: value.cost.cacheWrite as number,
      total: value.cost.total as number,
    },
  };
}

function promptText(message: Record<string, unknown>): string | undefined {
  if (message.role !== "user") return undefined;
  if (typeof message.content === "string") return message.content.trim() || undefined;
  if (!Array.isArray(message.content)) return undefined;
  const text = message.content.filter(object).filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string).join(" ").trim();
  return text || undefined;
}

function short(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= 64 ? oneLine : `${oneLine.slice(0, 61)}...`;
}

async function sessionFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    await Promise.all(entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".jsonl")) output.push(path);
    }));
  }
  await walk(root);
  return output.sort();
}

async function canonical(path: string): Promise<string> {
  try { return await realpath(path); } catch { return normalize(resolve(path)); }
}

async function parseSession(file: string, diagnostics: Diagnostic[]): Promise<RawSession | undefined> {
  let text: string;
  try { text = await readFile(file, "utf8"); } catch (error) {
    diagnostics.push({ file, message: `cannot read: ${String(error)}` });
    return undefined;
  }
  const lines = text.split(/\r?\n/);
  let header: Record<string, unknown> | undefined;
  const entries: RawSession["entries"] = [];
  let name: string | undefined;
  let firstPrompt: string | undefined;
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index]?.trim()) continue;
    let value: unknown;
    try { value = JSON.parse(lines[index]!); } catch {
      diagnostics.push({ file, line: index + 1, message: "invalid JSON" });
      continue;
    }
    if (!object(value)) {
      diagnostics.push({ file, line: index + 1, message: "record is not an object" });
      continue;
    }
    if (!header && value.type === "session") { header = value; continue; }
    entries.push({ value, line: index + 1 });
    if (value.type === "session_info") name = typeof value.name === "string" && value.name.trim() ? value.name.trim() : undefined;
    if (!firstPrompt && value.type === "message" && object(value.message)) firstPrompt = promptText(value.message);
  }
  if (!header || typeof header.id !== "string" || typeof header.cwd !== "string") {
    diagnostics.push({ file, message: "missing valid session header" });
    return undefined;
  }
  return { file: await canonical(file), header, entries, label: `${short(name ?? firstPrompt ?? "Untitled")} (${header.id})` };
}

class UnionFind {
  parent = new Map<string, string>();
  find(value: string): string {
    if (!this.parent.has(value)) this.parent.set(value, value);
    const parent = this.parent.get(value)!;
    if (parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }
  union(a: string, b: string): void {
    const ar = this.find(a), br = this.find(b);
    if (ar !== br) this.parent.set(ar, br);
  }
}

export async function loadSnapshot(sessionRoot: string): Promise<Snapshot> {
  const diagnostics: Diagnostic[] = [];
  const files = await sessionFiles(sessionRoot);
  const sessions = (await Promise.all(files.map((file) => parseSession(file, diagnostics))))
    .filter((session): session is RawSession => session !== undefined);
  const uf = new UnionFind();
  const parentByFile = new Map<string, string>();
  for (const session of sessions) {
    const rawParent = session.header.parentSession;
    if (typeof rawParent !== "string" || !rawParent) { uf.find(session.file); continue; }
    const parent = await canonical(isAbsolute(rawParent) ? rawParent : resolve(session.file, "..", rawParent));
    parentByFile.set(session.file, parent);
    uf.union(session.file, parent);
  }
  const depth = (file: string): number => {
    let current = file, result = 0;
    const seen = new Set<string>();
    while (parentByFile.has(current) && !seen.has(current)) {
      seen.add(current); current = parentByFile.get(current)!; result++;
    }
    return result;
  };
  type Candidate = { session: RawSession; entry: Record<string, unknown>; line: number };
  const candidates = new Map<string, Candidate>();
  for (const session of sessions) for (const { value: entry, line } of session.entries) {
    const id = entry.id;
    if (typeof id !== "string" || !id) {
      diagnostics.push({ file: session.file, line, message: "entry missing id" });
      continue;
    }
    const key = `${uf.find(session.file)}\0${id}`;
    const existing = candidates.get(key);
    if (!existing || depth(session.file) < depth(existing.session.file)
      || (depth(session.file) === depth(existing.session.file) && session.file < existing.session.file)) {
      candidates.set(key, { session, entry, line });
    }
  }
  const records: UsageRecord[] = [];
  for (const { session, entry, line } of candidates.values()) {
    let usageValue: unknown;
    let provider = "Unknown", model = "Unknown";
    if (entry.type === "message" && object(entry.message)) {
      if (entry.message.role === "assistant") {
        usageValue = entry.message.usage;
        provider = typeof entry.message.provider === "string" && entry.message.provider ? entry.message.provider : "Unknown";
        model = typeof entry.message.model === "string" && entry.message.model ? entry.message.model : "Unknown";
      } else if (entry.message.role === "toolResult") usageValue = entry.message.usage;
      else continue;
    } else if (entry.type === "compaction" || entry.type === "branch_summary") usageValue = entry.usage;
    else continue;
    if (usageValue === undefined) continue;
    const usage = usageOf(usageValue);
    if (!usage) {
      diagnostics.push({ file: session.file, line, message: "malformed usage" });
      continue;
    }
    const timestamp = typeof entry.timestamp === "string" ? new Date(entry.timestamp) : new Date(Number.NaN);
    if (!Number.isFinite(timestamp.getTime())) {
      diagnostics.push({ file: session.file, line, message: "usage entry has invalid timestamp" });
      continue;
    }
    const componentTotal = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
    if (Math.abs(componentTotal - usage.cost.total) > 1e-9) {
      diagnostics.push({ file: session.file, line, message: `cost mismatch: components ${componentTotal} != total ${usage.cost.total}` });
    }
    const sessionId = session.header.id as string;
    records.push({
      entryId: entry.id as string,
      timestamp,
      project: session.header.cwd as string,
      provider,
      model: provider === "Unknown" || model === "Unknown" ? "Unknown" : `${provider}/${model}`,
      session: session.label,
      sessionId,
      cost: usage.cost,
      totalTokens: usage.totalTokens,
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
    });
  }
  const identities: IdentityDimension[] = ["project", "provider", "model", "session"];
  const values = Object.fromEntries(identities.map((dimension) => [dimension,
    [...new Set(records.map((record) => record[dimension]))].sort(naturalCompare),
  ])) as Record<IdentityDimension, string[]>;
  return { records, diagnostics, values, files: sessions.length };
}

export type Filters = Partial<Record<IdentityDimension, string[]>> & { from?: Date; to?: Date };
export type GroupNode = { key: string; label: string; dimension?: Dimension; metrics: Metrics; children: GroupNode[] };

export function emptyMetrics(): Metrics {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, totalTokens: 0,
    inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, sessions: new Set(), operations: 0 };
}
function add(metrics: Metrics, record: UsageRecord): void {
  metrics.input += record.cost.input; metrics.output += record.cost.output;
  metrics.cacheRead += record.cost.cacheRead; metrics.cacheWrite += record.cost.cacheWrite; metrics.total += record.cost.total;
  metrics.inputTokens += record.inputTokens; metrics.outputTokens += record.outputTokens;
  metrics.cacheReadTokens += record.cacheReadTokens; metrics.cacheWriteTokens += record.cacheWriteTokens;
  metrics.totalTokens += record.totalTokens;
  metrics.sessions.add(record.sessionId); metrics.operations++;
}
function pad(value: number): string { return String(value).padStart(2, "0"); }
export function calendarKey(date: Date, dimension: CalendarDimension): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dimension === "week") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
  } else if (dimension === "month") d.setDate(1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function valueFor(record: UsageRecord, dimension: Dimension): string {
  return dimension === "day" || dimension === "week" || dimension === "month"
    ? calendarKey(record.timestamp, dimension) : record[dimension];
}
export function filterRecords(records: UsageRecord[], filters: Filters): UsageRecord[] {
  return records.filter((record) => {
    if (filters.from && record.timestamp < filters.from) return false;
    if (filters.to && record.timestamp > filters.to) return false;
    return (["project", "provider", "model", "session"] as IdentityDimension[]).every((dimension) => {
      const terms = filters[dimension];
      return !terms?.length || terms.some((term) => record[dimension].toLocaleLowerCase().includes(term.toLocaleLowerCase()));
    });
  });
}
export function aggregate(records: UsageRecord[], groups: Dimension[], topLevelCalendarKeys: string[] = []): GroupNode {
  const root: GroupNode = { key: "root", label: "Total", metrics: emptyMetrics(), children: [] };
  const maps = new WeakMap<GroupNode, Map<string, GroupNode>>();
  for (const record of records) {
    add(root.metrics, record);
    let node = root;
    groups.forEach((dimension, index) => {
      let map = maps.get(node); if (!map) { map = new Map(); maps.set(node, map); }
      const label = valueFor(record, dimension);
      let child = map.get(label);
      if (!child) { child = { key: `${node.key}/${dimension}:${label}`, label, dimension, metrics: emptyMetrics(), children: [] }; map.set(label, child); node.children.push(child); }
      add(child.metrics, record); node = child;
    });
  }
  if (groups[0] && ["day", "week", "month"].includes(groups[0]) && topLevelCalendarKeys.length) {
    const existing = new Set(root.children.map((child) => child.label));
    for (const label of topLevelCalendarKeys) if (!existing.has(label)) root.children.push({
      key: `root/${groups[0]}:${label}`, label, dimension: groups[0], metrics: emptyMetrics(), children: [],
    });
  }
  return root;
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
