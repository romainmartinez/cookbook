import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";
import { aggregate, calendarKey, filterRecords, loadSnapshot, type UsageRecord } from "./data.ts";

const usage = (total: number, input = 1) => ({
  input,
  output: 2,
  cacheRead: 3,
  cacheWrite: 4,
  totalTokens: input + 9,
  cost: {
    input: total / 4,
    output: total / 4,
    cacheRead: total / 4,
    cacheWrite: total / 4,
    total,
  },
});

async function temporaryDirectory(t: TestContext, prefix = "pi-cost-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function fixture(t: TestContext, files: Record<string, unknown[]>): Promise<string> {
  const root = await temporaryDirectory(t);
  for (const [name, lines] of Object.entries(files)) {
    const path = join(root, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${lines.map((line) =>
      typeof line === "string" ? line : JSON.stringify(line)
    ).join("\n")}\n`);
  }
  return root;
}

const header = (id: string, cwd: string, parentSession?: string) => ({
  type: "session",
  version: 3,
  id,
  cwd,
  timestamp: "2025-01-01T00:00:00Z",
  ...(parentSession ? { parentSession } : {}),
});
const entry = (type: string, id: string, extra: object = {}) => ({
  type,
  id,
  parentId: null,
  timestamp: "2025-01-06T12:00:00Z",
  ...extra,
});

function record(overrides: Partial<UsageRecord>): UsageRecord {
  return {
    timestamp: new Date(2025, 0, 6, 12),
    project: "/Alpha",
    provider: "OpenAI",
    model: "OpenAI/x",
    session: "One",
    sessionId: "1",
    entryId: "1",
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    totalTokens: 1,
    inputTokens: 1,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    ...overrides,
  };
}

test("parses every persisted usage source and labels the session", async (t) => {
  const root = await fixture(t, {
    "project/a.jsonl": [
      header("session-a", "/full/project"),
      entry("message", "u", { message: { role: "user", content: "First prompt" } }),
      entry("session_info", "n", { name: "Latest name" }),
      entry("message", "a", { message: { role: "assistant", provider: "p", model: "m", usage: usage(4) } }),
      entry("message", "t", { message: { role: "toolResult", usage: usage(8) } }),
      entry("compaction", "c", { usage: usage(12) }),
      entry("branch_summary", "b", { usage: usage(16) }),
    ],
  });

  const snapshot = await loadSnapshot(root);
  assert.deepEqual(snapshot.records.map((item) => item.cost.total), [4, 8, 12, 16]);
  assert.deepEqual(snapshot.records.map((item) => item.provider), ["p", "Unknown", "Unknown", "Unknown"]);
  assert.deepEqual(snapshot.records.map((item) => item.model), ["p/m", "Unknown", "Unknown", "Unknown"]);
  assert.ok(snapshot.records.every((item) => item.session === "Latest name (session-a)"));
  assert.equal(snapshot.files, 1);

  const metrics = aggregate(snapshot.records, []).metrics;
  assert.equal(metrics.total, 40);
  assert.equal(metrics.totalTokens, 40);
  assert.equal(metrics.operations, 4);
});

test("reports malformed persisted data without discarding valid usage", async (t) => {
  const mismatched = usage(10);
  const root = await fixture(t, {
    "a.jsonl": [
      header("session-a", "/project"),
      entry("compaction", "valid", { usage: { ...mismatched, cost: { ...mismatched.cost, total: 11 } } }),
      entry("compaction", "bad-usage", { usage: { cost: {} } }),
      entry("compaction", "bad-time", { timestamp: "not-a-date", usage: usage(2) }),
      "{not json",
    ],
  });

  const snapshot = await loadSnapshot(root);
  assert.equal(snapshot.records.length, 1);
  assert.deepEqual(snapshot.diagnostics.map((item) => item.message).sort(), [
    "cost mismatch: components 10 != total 11",
    "invalid JSON",
    "malformed usage",
    "usage entry has invalid timestamp",
  ]);
});

test("deduplicates copied entries within lineages and attributes them to the ancestor", async (t) => {
  const root = await temporaryDirectory(t, "pi-cost-lineage-");
  const parent = join(root, "p.jsonl");
  const child = join(root, "child.jsonl");
  const unrelated = join(root, "other.jsonl");
  await writeFile(parent, [
    header("parent", "/original"),
    entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(2) } }),
  ].map((value) => JSON.stringify(value)).join("\n"));
  await writeFile(child, [
    header("child", "/copy", parent),
    entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(2) } }),
    entry("compaction", "new", { usage: usage(3) }),
  ].map((value) => JSON.stringify(value)).join("\n"));
  await writeFile(unrelated, [
    header("other", "/other"),
    entry("message", "same", { message: { role: "assistant", provider: "p", model: "m", usage: usage(5) } }),
  ].map((value) => JSON.stringify(value)).join("\n"));

  const snapshot = await loadSnapshot(root);
  assert.equal(snapshot.records.length, 3);
  assert.equal(snapshot.records.find((item) => item.cost.total === 2)?.project, "/original");
  assert.equal(aggregate(snapshot.records, []).metrics.total, 10);
});

test("siblings with a missing parent share one lineage", async (t) => {
  const root = await temporaryDirectory(t, "pi-cost-siblings-");
  const missing = join(root, "missing.jsonl");
  for (const [name, id] of [["a.jsonl", "a"], ["b.jsonl", "b"]]) {
    await writeFile(join(root, name), [
      header(id, `/${id}`, missing),
      entry("compaction", "copied", { usage: usage(1) }),
    ].map((value) => JSON.stringify(value)).join("\n"));
  }

  assert.equal((await loadSnapshot(root)).records.length, 1);
});

test("filters use OR within a dimension and AND across dimensions", () => {
  const records = [
    record({ project: "/Alpha", provider: "OpenAI" }),
    record({ entryId: "2", project: "/Beta", provider: "Other" }),
  ];

  assert.deepEqual(filterRecords(records, { project: ["alp", "bet"] }), records);
  assert.deepEqual(filterRecords(records, { project: ["alp", "zzz"], provider: ["open"] }), [records[0]]);
  assert.deepEqual(filterRecords(records, { project: ["alp"], provider: ["other"] }), []);
});

test("date bounds are inclusive and aggregation fills local calendar periods", () => {
  const first = record({ timestamp: new Date(2025, 0, 6, 0, 0, 0, 0) });
  const last = record({ entryId: "2", timestamp: new Date(2025, 0, 6, 23, 59, 59, 999) });
  const outside = record({ entryId: "3", timestamp: new Date(2025, 0, 7) });
  const records = [first, last, outside];

  assert.deepEqual(filterRecords(records, {
    from: new Date(2025, 0, 6),
    to: new Date(2025, 0, 6, 23, 59, 59, 999),
  }), [first, last]);

  const tree = aggregate([first], ["day", "project"], ["2025-01-06", "2025-01-07"]);
  assert.deepEqual(tree.children.map((node) => node.label).sort(), ["2025-01-06", "2025-01-07"]);
  assert.equal(tree.children.find((node) => node.label === "2025-01-07")?.children.length, 0);
  assert.equal(calendarKey(new Date(2025, 0, 8), "week"), "2025-01-06");
});
