import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { aggregate, calendarKey, filterRecords, loadSnapshot, type UsageRecord } from "./data.ts";

const usage = (total: number, input = 1) => ({
  input, output: 2, cacheRead: 3, cacheWrite: 4, totalTokens: input + 9,
  cost: { input: total / 4, output: total / 4, cacheRead: total / 4, cacheWrite: total / 4, total },
});
async function fixture(files: Record<string, unknown[]>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pi-cost-"));
  for (const [name, lines] of Object.entries(files)) {
    const path = join(root, name); await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, `${lines.map((line) => typeof line === "string" ? line : JSON.stringify(line)).join("\n")}\n`);
  }
  return root;
}
const header = (id: string, cwd: string, parentSession?: string) => ({ type: "session", version: 3, id, cwd, timestamp: "2025-01-01T00:00:00Z", ...(parentSession ? { parentSession } : {}) });
const entry = (type: string, id: string, extra: object = {}) => ({ type, id, parentId: null, timestamp: "2025-01-06T12:00:00Z", ...extra });

test("parses every persisted usage source, labels sessions, and reports malformed data", async () => {
  const root = await fixture({
    "project/a.jsonl": [header("session-a", "/full/project"),
      entry("message", "u", { message: { role: "user", content: "First prompt" } }),
      entry("session_info", "n", { name: "Latest name" }),
      entry("message", "a", { message: { role: "assistant", provider: "p", model: "m", usage: usage(4) } }),
      entry("message", "t", { message: { role: "toolResult", usage: usage(8) } }),
      entry("compaction", "c", { usage: usage(12) }),
      entry("branch_summary", "b", { usage: { ...usage(10), cost: { ...usage(10).cost, total: 11 } } }),
      entry("compaction", "bad", { usage: { cost: {} } }),
      "{not json",
    ],
  });
  const snapshot = await loadSnapshot(root);
  assert.equal(snapshot.records.length, 4);
  assert.deepEqual(snapshot.records.map((record) => record.cost.total), [4, 8, 12, 11]);
  assert.deepEqual(snapshot.records.map((record) => record.provider), ["p", "Unknown", "Unknown", "Unknown"]);
  assert.deepEqual(snapshot.records.map((record) => record.model), ["p/m", "Unknown", "Unknown", "Unknown"]);
  assert.match(snapshot.records[0]?.session ?? "", /^Latest name \(session-a\)$/);
  assert.equal(aggregate(snapshot.records, []).metrics.total, 35);
  assert.equal(aggregate(snapshot.records, []).metrics.totalTokens, 40);
  assert.equal(aggregate(snapshot.records, []).metrics.operations, 4);
  assert.equal(snapshot.diagnostics.filter((item) => item.message.includes("cost mismatch")).length, 1);
  assert.ok(snapshot.diagnostics.some((item) => item.message === "malformed usage"));
  assert.ok(snapshot.diagnostics.some((item) => item.message === "invalid JSON"));
});

test("deduplicates copied entries within lineages and attributes them to the ancestor", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-cost-lineage-"));
  const parent = join(root, "p.jsonl"), child = join(root, "child.jsonl"), unrelated = join(root, "other.jsonl");
  await writeFile(parent, [header("parent", "/original"), entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(2) } })].map((value) => JSON.stringify(value)).join("\n"));
  await writeFile(child, [header("child", "/copy", parent), entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(2) } }), entry("compaction", "new", { usage: usage(3) })].map((value) => JSON.stringify(value)).join("\n"));
  await writeFile(unrelated, [header("other", "/other"), entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(5) } })].map((value) => JSON.stringify(value)).join("\n"));
  const snapshot = await loadSnapshot(root);
  assert.equal(snapshot.records.length, 3);
  assert.equal(snapshot.records.find((record) => record.cost.total === 2)?.project, "/original");
  assert.equal(aggregate(snapshot.records, []).metrics.total, 10);
});

test("siblings with a missing parent share one lineage", async () => {
  const root = await mkdtemp(join(tmpdir(), "pi-cost-siblings-"));
  const missing = join(root, "missing.jsonl");
  for (const [name, id] of [["a.jsonl", "a"], ["b.jsonl", "b"]]) {
    await writeFile(join(root, name), [header(id, `/${id}`, missing), entry("compaction", "copied", { usage: usage(1) })].map((value) => JSON.stringify(value)).join("\n"));
  }
  assert.equal((await loadSnapshot(root)).records.length, 1);
});

test("filters use OR within a dimension, AND across dimensions, and local inclusive dates", () => {
  const records = [
    { timestamp: new Date(2025, 0, 6, 12), project: "/Alpha", provider: "OpenAI", model: "OpenAI/x", session: "One", sessionId: "1", entryId: "1", cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, totalTokens: 1, inputTokens: 1, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    { timestamp: new Date(2025, 0, 7, 12), project: "/Beta", provider: "Other", model: "Other/y", session: "Two", sessionId: "2", entryId: "2", cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, totalTokens: 2, inputTokens: 2, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  ] satisfies UsageRecord[];
  assert.equal(filterRecords(records, { project: ["alp", "zzz"], provider: ["open"], from: new Date(2025, 0, 6), to: new Date(2025, 0, 6, 23, 59, 59, 999) }).length, 1);
  const tree = aggregate(records.slice(0, 1), ["day", "project"], ["2025-01-06", "2025-01-07"]);
  assert.deepEqual(tree.children.map((node) => node.label).sort(), ["2025-01-06", "2025-01-07"]);
  assert.equal(tree.children.find((node) => node.label === "2025-01-07")?.children.length, 0);
  assert.equal(calendarKey(new Date(2025, 0, 8), "week"), "2025-01-06");
});
