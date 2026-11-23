import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./highlight.pl", import.meta.url));
const highlight = (query: string, input: string) => execFileSync("perl", ["-CSDA", script, query, "/dev/stdin"], { input, encoding: "utf8" });
const on = (text: string) => `\x1b[7m${text}\x1b[27m`;

test("highlights each term case-insensitively", () => {
  assert.equal(highlight("foo bar", "Foo BAR"), `${on("Foo")} ${on("BAR")}`);
});

test("matches case per term when it has uppercase", () => {
  assert.equal(highlight("Foo", "Foo foo"), `${on("Foo")} foo`);
  assert.equal(highlight("foo BAR", "Foo bar BAR"), `${on("Foo")} bar ${on("BAR")}`);
});

test("leaves escape sequences intact", () => {
  assert.equal(highlight("m", "\x1b[1mm\x1b[0m"), `\x1b[1m${on("m")}\x1b[0m`);
  assert.equal(highlight("url", "\x1b]8;;url\x1b\\link\x1b]8;;\x1b\\"), "\x1b]8;;url\x1b\\link\x1b]8;;\x1b\\");
});

test("strips fzf operators and skips negations", () => {
  assert.equal(highlight("'foo ^bar baz$ !qux |", "foo bar baz qux |"), `${on("foo")} ${on("bar")} ${on("baz")} qux |`);
});

test("passes text through without a query", () => {
  assert.equal(highlight("", "foo"), "foo");
  assert.equal(highlight("!", "foo"), "foo");
});

test("highlights a falsy term", () => {
  assert.equal(highlight("0", "a0b"), `a${on("0")}b`);
});

test("handles non-ASCII text", () => {
  assert.equal(highlight("café", "CAFÉ"), on("CAFÉ"));
});

test("keeps box drawing characters intact", () => {
  assert.equal(highlight("hi", "╭─╮ hi"), `╭─╮ ${on("hi")}`);
});
