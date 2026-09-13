import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs, report } from "./index.ts";
import type { Snapshot, UsageRecord } from "./data.ts";

const now = new Date(2025, 5, 18, 14);

test("bare and preset arguments include the current local period", () => {
  const bare = parseArgs("", now);
  assert.deepEqual(bare.groups, ["day", "project"]);
  assert.equal(bare.calendarKeys.length, 7);
  assert.equal(bare.calendarKeys.at(-1), "2025-06-18");

  const weekly = parseArgs("weekly", now);
  assert.deepEqual(weekly.groups, ["week", "project"]);
  assert.equal(weekly.calendarKeys.length, 12);
  assert.equal(weekly.calendarKeys.at(-1), "2025-06-16");

  const monthly = parseArgs("monthly", now);
  assert.equal(monthly.calendarKeys.length, 12);
  assert.equal(monthly.calendarKeys.at(-1), "2025-06-01");
});

test("parses ordered groups, repeated filters, and inclusive bounds", () => {
  const parsed = parseArgs("--group project,provider,session --from 2025-01-02 --to=2025-01-03 --project Alpha --project 'Beta app' --model gpt", now);
  assert.deepEqual(parsed.groups, ["project", "provider", "session"]);
  assert.deepEqual(parsed.filters.project, ["Alpha", "Beta app"]);
  assert.deepEqual(parsed.filters.model, ["gpt"]);
  assert.equal(parsed.from.getHours(), 0);
  assert.equal(parsed.to.getHours(), 23);
  assert.equal(parsed.to.getMilliseconds(), 999);
  assert.equal(parsed.calendarKeys.length, 0);
});

test("validates conflicting and invalid arguments", () => {
  assert.throws(() => parseArgs("--group day,week", now), /at most one calendar/);
  assert.throws(() => parseArgs("--group project,project", now), /unique/);
  assert.throws(() => parseArgs("--since 7d --from 2025-01-01", now), /cannot be combined/);
  assert.throws(() => parseArgs("--from nope", now), /invalid --from/);
  assert.throws(() => parseArgs("--wat value", now), /unknown option/);
});

test("no-calendar grouping defaults to 30 local dates", () => {
  const parsed = parseArgs("--group project", now);
  assert.deepEqual(
    [parsed.from.getFullYear(), parsed.from.getMonth(), parsed.from.getDate()],
    [2025, 4, 20],
  );
  assert.deepEqual(
    [parsed.to.getFullYear(), parsed.to.getMonth(), parsed.to.getDate()],
    [2025, 5, 18],
  );
});

test("RPC report includes grouped cost, token, and activity metrics", () => {
  const record = {
    entryId: "entry",
    timestamp: new Date(2025, 5, 18, 12),
    project: "/work/cookbook",
    provider: "provider",
    model: "provider/model",
    session: "Build cost (session)",
    sessionId: "session",
    cost: { input: 0.25, output: 0.5, cacheRead: 0.1, cacheWrite: 0.15, total: 1 },
    totalTokens: 100,
    inputTokens: 40,
    outputTokens: 20,
    cacheReadTokens: 30,
    cacheWriteTokens: 10,
  } satisfies UsageRecord;
  const snapshot: Snapshot = {
    records: [record],
    diagnostics: [],
    values: { project: [record.project], provider: [record.provider], model: [record.model], session: [record.session] },
    files: 1,
  };
  const lines = report(parseArgs("--group project,model", now), snapshot).split("\n");
  assert.equal(lines[0], "Total: $1.00  Sessions: 1  Operations: 1  Files: 1");
  assert.equal(lines[1], "Costs: input $0.25  output $0.50  cache read $0.10  cache write $0.15");
  assert.equal(lines[2], "Tokens: total 100  input 40  output 20  cache read 30  cache write 10");
  assert.deepEqual(lines.slice(5), [
    "Groups: project > model",
    "/work/cookbook  $1.00  100.0%  cost[in=$0.25 out=$0.50 read=$0.10 write=$0.15]  tokens[total=100 in=40 out=20 read=30 write=10]  sessions=1  operations=1",
    "  provider/model  $1.00  100.0%  cost[in=$0.25 out=$0.50 read=$0.10 write=$0.15]  tokens[total=100 in=40 out=20 read=30 write=10]  sessions=1  operations=1",
  ]);
});
