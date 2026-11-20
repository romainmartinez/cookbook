import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { color, type Item, oneLine, renderTurns, type Turn } from "./tv.ts";

type Session = { path: string; modified: Date };

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
    const { role, content } = JSON.parse(line).message;
    if (role !== "user" && role !== "assistant") return [];
    const text = textOf(content);
    return text ? [{ role: role === "user" ? "you" : "pi", text }] : [];
  });
}

export function sessionLine(jsonl: Buffer): string {
  const info = jsonl.lastIndexOf('{"type":"session_info"');
  const user = jsonl.indexOf('"message":{"role":"user"');
  const name: string | undefined = info === -1 ? undefined : lineAt(jsonl, info).name?.trim();
  const title = name || (user === -1 ? "" : textOf(lineAt(jsonl, user).message.content));
  let count = 0;
  for (let at = jsonl.indexOf(messageLine); at !== -1; at = jsonl.indexOf(messageLine, at + 1)) count++;
  return `${oneLine(title) || color("90", "(no messages)")}  ${color("90", `(${count})`)}`;
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
