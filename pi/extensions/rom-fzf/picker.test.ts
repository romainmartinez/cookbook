import assert from "node:assert/strict";
import test from "node:test";
import { initTheme } from "@earendil-works/pi-coding-agent";
import { stripVTControlCharacters } from "node:util";
import { ago, dateColumns, parsePick, renderTurns } from "./picker.ts";

const now = new Date(2026, 10, 19, 15, 0);
const at = (...args: number[]) => new Date(2026, 10, ...(args as [number]));

initTheme("dark");

const item = { line: () => "", preview: () => "" };

test("aligns the date column and leaves undated rows blank", () => {
  assert.deepEqual(dateColumns([{ date: at(19, 13, 0), ...item }, { date: at(18, 9, 0), ...item }, item], now), [
    "\x1b[90m2h ago   \x1b[0m  ",
    "\x1b[90myesterday\x1b[0m  ",
    "\x1b[90m         \x1b[0m  ",
  ]);
  assert.deepEqual(dateColumns([item, item], now), ["", ""]);
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

test("reads the picked index or a request for the next view", () => {
  assert.equal(parsePick("\n2\n"), 2);
  assert.equal(parsePick("\n0\n"), 0);
  assert.equal(parsePick("ctrl-t\n11\n"), "next");
  assert.equal(parsePick("ctrl-t\n"), "next");
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
