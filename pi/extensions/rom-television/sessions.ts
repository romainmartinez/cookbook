import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { truncateToWidth } from "@earendil-works/pi-tui";
import { messageItem, summary } from "./messages.ts";
import { color, type Item, oneLine, renderTurns, type Turn } from "./tv.ts";

type Session = { path: string; modified: Date };
type Hit = Turn & { path: string; title: string };

const textOf = (content: any): string =>
  (typeof content === "string" ? content : content.filter((part: any) => part.type === "text").map((part: any) => part.text).join("\n")).trim();

const newline = 10;
const messageLine = Buffer.from('\n{"type":"message"');

function lineAt(jsonl: Buffer, index: number): any {
  const end = jsonl.indexOf(newline, index);
  return JSON.parse(jsonl.subarray(jsonl.lastIndexOf(newline, index) + 1, end === -1 ? undefined : end).toString());
}

export function turns(jsonl: string): Turn[] {
  return jsonl.split("\n").flatMap((line) => {
    if (!line.startsWith('{"type":"message"')) return [];
    const { timestamp, message } = JSON.parse(line);
    if (message.role !== "user" && message.role !== "assistant") return [];
    const text = textOf(message.content);
    return text ? [{ role: message.role === "user" ? "you" : "pi", text, date: timestamp ? new Date(timestamp) : undefined }] : [];
  });
}

function sessionTitle(jsonl: Buffer): string {
  const info = jsonl.lastIndexOf('{"type":"session_info"');
  const user = jsonl.indexOf('"message":{"role":"user"');
  const name: string | undefined = info === -1 ? undefined : lineAt(jsonl, info).name?.trim();
  return oneLine(name || (user === -1 ? "" : textOf(lineAt(jsonl, user).message.content)));
}

export function sessionLine(jsonl: Buffer): string {
  let count = 0;
  for (let at = jsonl.indexOf(messageLine); at !== -1; at = jsonl.indexOf(messageLine, at + 1)) count++;
  return `${sessionTitle(jsonl) || color("90", "(no messages)")}  ${color("90", `(${count})`)}`;
}

export async function listSessions(dir: string, exclude?: string): Promise<Session[]> {
  const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith(".jsonl"));
  const sessions = await Promise.all(
    names.map(async (name) => {
      const path = join(dir, name);
      return { path, modified: (await stat(path)).mtime };
    }),
  );
  return sessions.filter(({ path }) => path !== exclude).sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export const sessionItem = ({ path, modified }: Session): Item => ({
  date: modified,
  line: async () => sessionLine(await readFile(path)),
  preview: async (width) => renderTurns(turns(await readFile(path, "utf8")), width),
});

export async function listHits(sessions: Session[]): Promise<Hit[]> {
  const files = await Promise.all(sessions.map(async ({ path }) => ({ path, jsonl: await readFile(path) })));
  return files
    .flatMap(({ path, jsonl }) => {
      const title = sessionTitle(jsonl);
      return turns(jsonl.toString()).map((turn) => ({ ...turn, path, title }));
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}

const titleWidth = 24;

export function hitItem(hit: Hit): Item {
  const line = `${color("90", truncateToWidth(hit.title, titleWidth, "…", true))} ${summary(hit)}`;
  return { ...messageItem(hit), line: () => line };
}
