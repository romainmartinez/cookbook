import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cacheHitRate, collectUsage, compactNumber, humanDay } from "./usage.ts";

function usageData(total: number, tokens: number) {
  return {
    input: 20,
    output: 10,
    cacheRead: 60,
    cacheWrite: 20,
    totalTokens: tokens,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total },
  };
}

function entry(id: string, timestamp: string, total: number, tokens: number) {
  return {
    type: "message",
    id,
    timestamp,
    message: { role: "assistant", usage: usageData(total, tokens) },
  };
}

test("collects and deduplicates the last seven local days", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "startup-usage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "nested"));
  await writeFile(join(root, "2025-09-15T10-00-00-000Z_a.jsonl"), [
    entry("today", "2025-09-15T12:00:00", 1.25, 110),
    {
      type: "usage",
      id: "cache-warm",
      timestamp: "2025-09-15T13:00:00",
      usage: usageData(0.25, 100),
    },
    entry("old", "2025-09-08T12:00:00", 99, 999),
    "not json",
  ].map((value) => typeof value === "string" ? value : JSON.stringify(value)).join("\n"));
  await writeFile(join(root, "nested", "2025-09-14T10-00-00-000Z_copy.jsonl"), [
    entry("today", "2025-09-15T12:00:00", 1.25, 110),
    entry("yesterday", "2025-09-14T12:00:00", 2, 1_200),
  ].map((value) => JSON.stringify(value)).join("\n"));
  const resumedPath = join(root, "2025-08-01T10-00-00-000Z_old.jsonl");
  await writeFile(resumedPath, JSON.stringify(
    entry("resumed-old-session", "2025-09-15T14:00:00", 50, 5_000),
  ));
  await utimes(resumedPath, new Date(2025, 8, 15, 14), new Date(2025, 8, 15, 14));
  const stalePath = join(root, "2025-09-01T10-00-00-000Z_stale.jsonl");
  await writeFile(stalePath, JSON.stringify(entry("stale-mtime", "2025-09-15T15:00:00", 1_000, 100_000)));
  await utimes(stalePath, new Date(2025, 8, 1), new Date(2025, 8, 1));

  const usage = await collectUsage(root, new Date(2025, 8, 15, 18));
  assert.equal(usage.days.length, 7);
  assert.deepEqual(usage.days.slice(0, 2).map(({ date, cost, tokens }) => ({ date, cost, tokens })), [
    { date: "2025-09-15", cost: 51.5, tokens: 5_210 },
    { date: "2025-09-14", cost: 2, tokens: 1_200 },
  ]);
  assert.equal(usage.total.cost, 53.5);
  assert.equal(usage.total.tokens, 6_410);
  assert.equal(cacheHitRate(usage.total), 0.6);
  assert.equal(usage.warnings, 0);
});

test("keeps unrelated entries with the same short ID", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "startup-usage-ids-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "2025-09-15T10-00-00-000Z_a.jsonl"), JSON.stringify(
    entry("same-id", "2025-09-15T12:00:00", 1, 100),
  ));
  await writeFile(join(root, "2025-09-15T11-00-00-000Z_b.jsonl"), JSON.stringify(
    entry("same-id", "2025-09-15T13:00:00", 2, 200),
  ));

  const usage = await collectUsage(root, new Date(2025, 8, 15, 18));
  assert.equal(usage.total.cost, 3);
  assert.equal(usage.total.tokens, 300);
});

test("reports unreadable recent session paths", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "startup-usage-warning-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await symlink(join(root, "missing.jsonl"), join(root, "2025-09-15T10-00-00-000Z_broken.jsonl"));

  const usage = await collectUsage(root, new Date(2025, 8, 15, 18));
  assert.equal(usage.warnings, 1);
});

test("formats usage values compactly", () => {
  assert.equal(compactNumber(999), "999");
  assert.equal(compactNumber(1_200), "1.2k");
  assert.equal(compactNumber(1_250_000), "1.3M");
  assert.equal(humanDay("2025-09-15"), "Mon Sept. 15");
});
