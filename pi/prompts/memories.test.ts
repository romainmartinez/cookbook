import assert from "node:assert/strict";
import test from "node:test";
import { belongsTo, dedupe, exchanges, isExpandedTemplate, parseSince, templatePrefixes } from "./memories.ts";

const line = (role: string, content: unknown, timestamp: number) =>
  JSON.stringify({ type: "message", timestamp: new Date(timestamp).toISOString(), message: { role, content, timestamp } });

const session = (...lines: string[]) =>
  [JSON.stringify({ type: "session", cwd: "/repo" }), line("system", "", 1), ...lines].join("\n");

test("pairs each prompt with the reply before it", () => {
  const jsonl = session(
    line("user", [{ type: "text", text: "first" }], 10),
    line("assistant", [{ type: "thinking", thinking: "x" }, { type: "text", text: "used npm" }], 11),
    line("toolResult", [{ type: "text", text: "noise" }], 12),
    line("user", "use pnpm, never npm", 13),
  );
  assert.deepEqual(exchanges(jsonl, "s", 0, []), [
    { session: "s", time: 10, reply: "", prompt: "first" },
    { session: "s", time: 13, reply: "used npm", prompt: "use pnpm, never npm" },
  ]);
});

test("skips prompts before the cutoff and malformed lines", () => {
  const jsonl = session(line("user", "old", 5), "{oops", line("user", "new", 20));
  assert.deepEqual(exchanges(jsonl, "s", 10, []).map((item) => item.prompt), ["new"]);
});

test("detects expanded prompt templates and skills", () => {
  const prefixes = templatePrefixes([
    "---\ndescription: x\n---\n\n# Grill Me\n\nOptional context: $ARGUMENTS\n",
    "short $ARGUMENTS",
  ]);
  assert.deepEqual(prefixes, ["# Grill Me\n\nOptional context:"]);
  assert.equal(isExpandedTemplate("# Grill Me\n\nOptional context: my plan", prefixes), true);
  assert.equal(isExpandedTemplate('<skill name="rex">...', prefixes), true);
  assert.equal(isExpandedTemplate("grill me on this", prefixes), false);
});

test("removes prompts repeated by forked sessions", () => {
  const item = { session: "a", time: 1, reply: "", prompt: "p" };
  assert.deepEqual(dedupe([item, { ...item, session: "b" }, { ...item, time: 2 }]).map((i) => i.time), [1, 2]);
});

test("parses relative and absolute --since values", () => {
  const now = Date.parse("2026-11-17T00:00:00Z");
  const day = 86_400_000;
  for (const value of ["15d", "15 days", "15 Days", "15day"]) assert.equal(parseSince(value, now), now - 15 * day, value);
  assert.equal(parseSince("2w", now), now - 14 * day);
  assert.equal(parseSince("1 week", now), now - 7 * day);
  assert.equal(parseSince("2026-11-01", now), Date.parse("2026-11-01"));
  for (const value of ["15", "15 months", "soon"]) assert.throws(() => parseSince(value, now), value);
});

test("matches sessions inside the project root only", () => {
  assert.equal(belongsTo("/repo", "/repo"), true);
  assert.equal(belongsTo("/repo/sub", "/repo"), true);
  assert.equal(belongsTo("/repo-other", "/repo"), false);
  assert.equal(belongsTo(undefined, "/repo"), false);
});
