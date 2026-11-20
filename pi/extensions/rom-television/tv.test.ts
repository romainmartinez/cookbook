import assert from "node:assert/strict";
import test from "node:test";
import { initTheme } from "@earendil-works/pi-coding-agent";
import { stripVTControlCharacters } from "node:util";
import { ago, prefixes, parsePick, renderTurns } from "./tv.ts";

const now = new Date(2026, 10, 19, 15, 0);
const at = (...args: number[]) => new Date(2026, 10, ...(args as [number]));

initTheme("dark");

const item = { line: () => "", preview: () => "" };

test("numbers rows with aligned padding", () => {
  const rows = prefixes(Array.from({ length: 10 }, () => item));
  assert.equal(rows[0], "1  ");
  assert.equal(rows[9], "10 ");
});

test("aligns the date column and leaves undated rows blank", () => {
  assert.deepEqual(prefixes([{ date: at(19, 13, 0), ...item }, { date: at(18, 9, 0), ...item }, item], now), [
    "1 \x1b[90m2h ago   \x1b[0m  ",
    "2 \x1b[90myesterday\x1b[0m  ",
    "3 \x1b[90m         \x1b[0m  ",
  ]);
});

test("formats dates relative to now", () => {
  assert.equal(ago(at(19, 14, 59, 30), now), "just now");
  assert.equal(ago(at(19, 14, 55), now), "5m ago");
  assert.equal(ago(at(19, 0, 30), now), "14h ago");
  assert.equal(ago(at(18, 23, 0), now), "yesterday");
  assert.equal(ago(at(16, 12, 0), now), "3d ago");
  assert.equal(ago(at(2, 12, 0), now), "Nov 2");
  assert.equal(ago(new Date(2025, 10, 2), now), "Nov 2, 2025");
});

test("maps the picked line back to a zero-based index", () => {
  assert.deepEqual(parsePick("3  \x1b[1;33myou\x1b[0m hi\n"), { index: 2, key: undefined });
  assert.deepEqual(parsePick("ctrl-t\n12 hi\n"), { index: 11, key: "ctrl-t" });
  assert.equal(parsePick(""), undefined);
});

test("renders labeled turns as boxed markdown within the width", () => {
  const preview = stripVTControlCharacters(renderTurns([{ role: "you", text: "**hi**" }, { role: "pi", text: "# Title\n\n- a b c" }], 10));
  assert.equal(
    preview,
    [
      "╭────────╮", "│ you    │", "│ hi     │", "╰────────╯",
      "",
      "╭────────╮", "│ pi     │", "│ Title  │", "│        │", "│ - a b  │", "│   c    │", "╰────────╯",
    ].join("\n"),
  );
});
