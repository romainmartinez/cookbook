import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ExtensionContext, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Markdown, type TUI, visibleWidth } from "@earendil-works/pi-tui";

export type Item = { date?: Date; line: () => string | Promise<string>; preview: (width: number) => string | Promise<string> };
export type Turn = { role: "you" | "pi"; text: string; date?: Date };

const previewSize = 40;

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

const roleColor = (role: Turn["role"]) => (role === "you" ? "1;33" : "1;36");

export const label = (role: Turn["role"]) => color(roleColor(role), role.padStart(3));

function box(lines: string[], width: number): string[] {
  const border = (text: string) => color("90", text);
  return [
    border(`╭${"─".repeat(width - 2)}╮`),
    ...lines.map((line) => `${border("│")} ${line}${" ".repeat(Math.max(0, width - 4 - visibleWidth(line)))} ${border("│")}`),
    border(`╰${"─".repeat(width - 2)}╯`),
  ];
}

export function renderTurn({ role, text }: Turn, width: number): string[] {
  return [color(roleColor(role), role), ...new Markdown(text, 0, 0, getMarkdownTheme()).render(width).map((line) => line.trimEnd())];
}

export function renderTurns(turns: Turn[], width: number): string {
  return turns.map((turn) => box(renderTurn(turn, width - 4), width).join("\n")).join("\n\n");
}

export function dateColumns(items: Item[], now = new Date()): string[] {
  const dates = items.map((item) => (item.date ? ago(item.date, now) : ""));
  const width = Math.max(0, ...dates.map((date) => date.length));
  return dates.map((date) => (width ? `${color("90", date.padEnd(width))}  ` : ""));
}

export function parsePick(stdout: string): number | "next" | undefined {
  const [key, line = ""] = stdout.split("\n");
  if (key) return "next";
  const index = Number.parseInt(line, 10);
  return Number.isInteger(index) ? index : undefined;
}

const highlight = fileURLToPath(new URL("./highlight.pl", import.meta.url));

// fzf has no pane focus, so tab toggles the preview label and each scroll key reads it back.
const focused = (preview: string, list: string) => `transform:[ -n "$FZF_PREVIEW_LABEL" ] && echo ${preview} || echo ${list}`;
const bindings = [
  `tab:${focused("change-preview-label:", "change-preview-label:' preview '")}`,
  `ctrl-d:${focused("preview-half-page-down", "half-page-down")}`,
  `ctrl-u:${focused("preview-half-page-up", "half-page-up")}`,
].flatMap((binding) => ["--bind", binding]);

export async function pick(label: string, items: Item[], columns: number): Promise<number | "next" | undefined> {
  const dir = await mkdtemp(join(tmpdir(), "pi-fzf-"));
  // Previews are rendered ahead of time, before fzf reports $FZF_PREVIEW_COLUMNS, so estimate it minus borders and padding.
  const width = Math.max(20, Math.floor((columns * previewSize) / 100) - 4);
  const child = spawn(
    "fzf",
    [
      // fzf otherwise runs this through $SHELL, which may not be POSIX (fish).
      "--with-shell", "sh -c",
      "--preview", `until [ -e {n}.txt ]; do sleep 0.05; done; perl -CSDA "$ROM_FZF_HIGHLIGHT" {q} {n}.txt`,
      "--preview-window", `right,${previewSize}%`,
      "--input-label", ` ${label} `,
      "--style", "full",
      "--layout", "reverse",
      "--exact",
      "--scheme", "history",
      "--accept-nth", "{n}",
      "--ansi",
      ...bindings,
      "--expect", "ctrl-t",
      "--ghost", "ctrl-t next view · tab focus preview",
    ],
    { cwd: dir, env: { ...process.env, ROM_FZF_HIGHLIGHT: highlight }, stdio: ["pipe", "pipe", "inherit"] },
  );
  child.stdin.on("error", () => {});
  let stdout = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  let closed = false;
  const exited = once(child, "close").finally(() => (closed = true));

  const feed = async () => {
    try {
      for (const [index, column] of dateColumns(items).entries()) {
        if (!child.stdin.writable) return;
        child.stdin.write(`${column}${await items[index].line()}\n`);
      }
    } finally {
      child.stdin.end();
    }
    for (const [index, item] of items.entries()) {
      if (closed) return;
      const file = join(dir, `${index}.txt`);
      await writeFile(`${file}.tmp`, await item.preview(width));
      await rename(`${file}.tmp`, file);
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

export const withTui = <T>(ctx: ExtensionContext, run: (tui: TUI) => Promise<T>) =>
  ctx.ui.custom<T | undefined>((tui, _theme, _kb, done) => {
    run(tui)
      .catch((error) => void ctx.ui.notify(`Picker: ${error instanceof Error ? error.message : error}`, "error"))
      .then(done);
    return { render: () => [], invalidate: () => {} };
  });
