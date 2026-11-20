import assert from "node:assert/strict";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { listSessions, sessionLine, turns } from "./sessions.ts";

const lines = (...entries: object[]) => entries.map((entry) => JSON.stringify(entry)).join("\n");
const message = (role: string, content: unknown) => ({ type: "message", message: { role, content } });

const session = lines(
  { type: "session", cwd: "/x" },
  message("system", "prompt"),
  message("user", [{ type: "text", text: " hi \n there " }]),
  message("assistant", [{ type: "thinking", thinking: "hm" }, { type: "text", text: "hello" }]),
  message("assistant", [{ type: "toolCall" }]),
  message("toolResult", [{ type: "text", text: "out" }]),
);

test("renders user and assistant text only", () => {
  assert.deepEqual(turns(session), [{ role: "you", text: "hi \n there" }, { role: "pi", text: "hello" }]);
});

test("titles a session by its first user message and counts messages", () => {
  assert.equal(sessionLine(Buffer.from(session)), "hi there  \x1b[90m(5)\x1b[0m");
});

test("prefers the latest session name, falling back when cleared", () => {
  const named = `${session}\n${lines({ type: "session_info", name: "old" }, { type: "session_info", name: " fix bug " })}`;
  assert.match(sessionLine(Buffer.from(named)), /^fix bug /);
  assert.match(sessionLine(Buffer.from(`${named}\n${lines({ type: "session_info" })}`)), /^hi there /);
});

test("marks sessions without user messages", () => {
  assert.match(sessionLine(Buffer.from(lines({ type: "session" }))), /\(no messages\)/);
});

test("lists sessions newest first, skipping the current one", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rom-television-"));
  try {
    for (const [name, seconds] of [["a.jsonl", 1], ["b.jsonl", 3], ["c.jsonl", 2], ["notes.txt", 4]] as const) {
      await writeFile(join(dir, name), "");
      await utimes(join(dir, name), seconds, seconds);
    }
    const sessions = await listSessions(dir, join(dir, "c.jsonl"));
    assert.deepEqual(sessions.map(({ path }) => path), [join(dir, "b.jsonl"), join(dir, "a.jsonl")]);
    assert.deepEqual(await listSessions(join(dir, "missing")), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
