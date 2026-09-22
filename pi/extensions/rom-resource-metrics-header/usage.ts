import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

export type UsageTotals = {
  cost: number;
  tokens: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type UsageDay = UsageTotals & { date: string };
export type UsageSnapshot = { days: UsageDay[]; total: UsageTotals; warnings: number };

type UsageEntry = UsageTotals & { id: string; timestamp: Date };

function emptyTotals(): UsageTotals {
  return { cost: 0, tokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

function add(target: UsageTotals, usage: UsageTotals): void {
  target.cost += usage.cost;
  target.tokens += usage.tokens;
  target.inputTokens += usage.inputTokens;
  target.cacheReadTokens += usage.cacheReadTokens;
  target.cacheWriteTokens += usage.cacheWriteTokens;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function usageFrom(entry: Record<string, unknown>): unknown {
  if (entry.type === "message" && isObject(entry.message)) {
    return entry.message.role === "assistant" || entry.message.role === "toolResult"
      ? entry.message.usage
      : undefined;
  }
  return entry.type === "usage" || entry.type === "compaction" || entry.type === "branch_summary"
    ? entry.usage
    : undefined;
}

function parseEntry(value: unknown): UsageEntry | undefined {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.timestamp !== "string") return undefined;
  const raw = usageFrom(value);
  if (!isObject(raw) || !isObject(raw.cost)) return undefined;

  const numbers = [raw.cost.total, raw.totalTokens, raw.input, raw.cacheRead, raw.cacheWrite];
  if (!numbers.every(isNumber)) return undefined;
  const timestamp = new Date(value.timestamp);
  if (!Number.isFinite(timestamp.getTime())) return undefined;

  return {
    id: value.id,
    timestamp,
    cost: raw.cost.total as number,
    tokens: raw.totalTokens as number,
    inputTokens: raw.input as number,
    cacheReadTokens: raw.cacheRead as number,
    cacheWriteTokens: raw.cacheWrite as number,
  };
}

async function sessionFiles(root: string, from: Date): Promise<{ files: string[]; warnings: number }> {
  const files: string[] = [];
  let warnings = 0;

  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") warnings++;
      return;
    }
    await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".jsonl")) {
        try {
          const metadata = await stat(path);
          if (metadata.isFile() && metadata.mtime >= from) files.push(path);
        } catch {
          warnings++;
        }
      }
    }));
  }

  await walk(root);
  return { files, warnings };
}

async function recentEntries(file: string, from: Date, to: Date): Promise<{ entries: UsageEntry[]; warning: boolean }> {
  const entries: UsageEntry[] = [];
  let warning = false;
  try {
    const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = parseEntry(JSON.parse(line));
        if (entry && entry.timestamp >= from && entry.timestamp <= to) entries.push(entry);
      } catch {}
    }
  } catch {
    warning = true;
  }
  return { entries, warning };
}

function dateKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function collectUsage(root: string, now = new Date()): Promise<UsageSnapshot> {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, index): UsageDay => {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index);
    return { date: dateKey(date), ...emptyTotals() };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  const seen = new Set<string>();
  const total = emptyTotals();
  const discovered = await sessionFiles(root, from);
  let warnings = discovered.warnings;

  for (const file of discovered.files) {
    const recent = await recentEntries(file, from, to);
    if (recent.warning) warnings++;
    for (const entry of recent.entries) {
      const key = `${entry.id}\0${entry.timestamp.getTime()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const day = byDate.get(dateKey(entry.timestamp));
      if (!day) continue;
      add(day, entry);
      add(total, entry);
    }
  }

  return { days: days.reverse(), total, warnings };
}

export function cacheHitRate(usage: UsageTotals): number {
  const promptTokens = usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
  return promptTokens === 0 ? 0 : usage.cacheReadTokens / promptTokens;
}

const SUFFIXES = ["", "k", "M", "B", "T", "Q"];

export function compactNumber(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude < 1_000) return Math.round(value).toLocaleString();

  let unit = Math.min(Math.floor(Math.log10(magnitude) / 3), SUFFIXES.length - 1);
  let scaled = value / 1_000 ** unit;
  let digits = Math.abs(scaled) < 10 ? 1 : 0;
  let rounded = Number(scaled.toFixed(digits));
  if (Math.abs(rounded) >= 1_000 && unit < SUFFIXES.length - 1) {
    unit++;
    scaled = value / 1_000 ** unit;
    digits = Math.abs(scaled) < 10 ? 1 : 0;
    rounded = Number(scaled.toFixed(digits));
  }
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: digits })}${SUFFIXES[unit]}`;
}

export function humanDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}
