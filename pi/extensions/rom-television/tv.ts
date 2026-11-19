import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type Entry = { line: string; preview: string };
export type Item = { date?: Date; entry: () => Entry | Promise<Entry> };

const day = 864e5;
const midnight = (date: Date) => new Date(date).setHours(0, 0, 0, 0);

export function ago(date: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 6e4);
  const days = Math.round((midnight(now) - midnight(date)) / day);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (days === 0) return `${Math.floor(minutes / 60)}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const year = date.getFullYear() === now.getFullYear() ? undefined : "numeric";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year });
}

export const color = (code: string, text: string) => `\x1b[${code}m${text}\x1b[0m`;

export const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

export function prefixes(items: Item[], now = new Date()): string[] {
  const width = String(items.length).length;
  const dates = items.map((item) => (item.date ? ago(item.date, now) : ""));
  const dateWidth = Math.max(0, ...dates.map((date) => date.length));
  return dates.map((date, index) => {
    const column = dateWidth ? `${color("90", date.padEnd(dateWidth))}  ` : "";
    return `${String(index + 1).padEnd(width)} ${column}`;
  });
}

export function parsePick(stdout: string): number | undefined {
  const number = Number.parseInt(stdout, 10);
  return Number.isInteger(number) ? number - 1 : undefined;
}

async function tv(header: string, items: Item[], render?: string): Promise<number | undefined> {
  const dir = await mkdtemp(join(tmpdir(), "pi-television-"));
  const child = spawn(
    "tv",
    [
      "--preview-command", render ? '"$TV_NODE" "$TV_RENDER" {split: :0}.txt' : "cat {split: :0}.txt",
      "--input-header", header,
      "--preview-size", "40",
      "--no-sort",
      "--ansi",
    ],
    { cwd: dir, env: { ...process.env, TV_NODE: process.execPath, TV_RENDER: render }, stdio: ["pipe", "pipe", "inherit"] },
  );
  child.stdin.on("error", () => {});
  let stdout = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  const exited = once(child, "close");

  const feed = async () => {
    try {
      for (const [index, prefix] of prefixes(items).entries()) {
        if (!child.stdin.writable) return;
        const { line, preview } = await items[index].entry();
        await writeFile(join(dir, `${index + 1}.txt`), preview);
        child.stdin.write(`${prefix}${line}\n`);
      }
    } finally {
      child.stdin.end();
    }
  };
  const failed = feed().then(() => undefined, (error: unknown) => error);

  try {
    await exited;
    const error = await failed;
    if (error) throw error;
    return parsePick(stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function pick(tui: any, header: string, items: Item[], render?: string): Promise<number | undefined> {
  tui.stop();
  try {
    return await tv(header, items, render);
  } finally {
    tui.start();
    tui.requestRender(true);
  }
}

export const withTui = <T>(ctx: ExtensionContext, run: (tui: any) => Promise<T>) =>
  ctx.ui.custom<T | undefined>((tui, _theme, _kb, done) => {
    run(tui)
      .catch((error) => void ctx.ui.notify(`Television: ${error instanceof Error ? error.message : error}`, "error"))
      .then(done);
    return { render: () => [], invalidate: () => {} };
  });
