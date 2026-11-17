import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { VOCABULARY, createPalette, decorate, toneOf, type ThemeLike } from "./index.ts";

const theme = {
	fg: (color: string, text: string) => `<${color}>${text}</>`,
	getFgAnsi: (color: string) => `\x1b[38;fg-${color}m`,
	getBgAnsi: (color: string) => `\x1b[48;bg-${color}m`,
} as unknown as ThemeLike;
const palette = createPalette(theme);
const plain = (text: string) => decorate(text, palette).replace(/\x1b\[[0-9;a-zA-Z-]*m/g, "").replace(/[\ue0b4\ue0b6]/g, "|").replace(/\u00a0/g, " ");

test("pill tone follows the word", () => {
	for (const [word, tone] of [
		["Failed", "error"], ["Blocked", "error"], ["Needs you", "warning"], ["Decision", "warning"],
		["Done", "success"], ["Observed", "success"], ["Costs money", "danger"], ["Irreversible", "danger"],
		["Inferred", "neutral"], ["Completed", "neutral"], ["Anything else", "neutral"],
	]) assert.equal(toneOf(word), tone, word);
	assert.equal(toneOf("  needs   YOU "), "warning");
	assert.equal(toneOf("Passed 12/12"), "success");
	assert.equal(toneOf("Failed: 3 tests"), "error");
	assert.equal(toneOf("Donezo"), "neutral");
});

test("pills get icons and a length limit", () => {
	assert.equal(plain("[[Done]]"), "|\uf00c Done|");
	assert.equal(plain("[[Inferred]]"), "|\uf0eb Inferred|");
	assert.equal(plain("[[Anything else]]"), "|Anything else|");
	assert.equal(plain("[[Failed: 3 tests]]"), "|\uf00d Failed: 3 tests|");
	assert.equal(plain("[[\uf0e7 Done]]"), "|\uf0e7 Done|");
	const long = `[[${"x".repeat(33)}]]`;
	assert.equal(plain(long), long);
});

test("headings and leading bold labels take icons", () => {
	assert.equal(plain("## Finding"), "## \uf002 Finding");
	assert.equal(plain("## What happened"), "## What happened");
	assert.equal(plain("**Cause:** x"), "**<mdLink>\uf0e7 Cause:</>** x");
	assert.equal(plain("- **Fix:** x"), "- **<mdLink>\uf0ad Fix:</>** x");
	assert.equal(plain("  ├── **Risk:** x"), "  <dim>├──</> **<mdLink>\uf071 Risk:</>** x");
	assert.equal(plain("see **Cause** here"), "see **<mdLink>Cause</>** here");
});

test("action lead-ins take an icon only with a colon", () => {
	assert.equal(plain("[[Unverified]] red pills. **Check:** run it"), "|\uf128 Unverified| red pills. **<mdLink>\uf046 Check:</>** run it");
	assert.equal(plain("**Next:** go"), "**<mdLink>\uf061 Next:</>** go");
	assert.equal(plain("please **do** it and **run** that"), "please **<mdLink>do</>** it and **<mdLink>run</>** that");
});

test("code and escaped markers are left alone", () => {
	const block = "```\n**Cause:** → [[Done]]\n```";
	assert.equal(plain(block), block);
	assert.equal(plain("`[[Done]] → **x**`"), "`[[Done]] → **x**`");
	assert.equal(plain("\\*\\*not bold\\*\\*"), "\\*\\*not bold\\*\\*");
});

test("arrows, checks and crosses take their colors", () => {
	assert.equal(plain("a → b ✓ c ✗"), "a <accent>→</> b <success>✓</> c <error>✗</>");
});

test("a symbol inside bold keeps the bold color after it", () => {
	assert.equal(plain("**a → b ✓ c**"), "**<mdLink>a <accent>→</><mdLink> b <success>✓</><mdLink> c</>**");
});

test("a symbol inside a pill keeps the pill with a real ANSI theme", () => {
	const ansi = {
		fg: (_color: string, text: string) => `\x1b[38;5;1m${text}\x1b[39m`,
		getFgAnsi: () => "\x1b[38;5;2m",
		getBgAnsi: () => "\x1b[48;5;3m",
	} as unknown as ThemeLike;
	const rendered = decorate("[[Done → ship]] and [[Passed ✓]]", createPalette(ansi));
	assert.ok(!rendered.includes("[["), rendered);
});

test("AGENTS.md names every pill word it should teach, so the rules match the renderer", () => {
	const rules = readFileSync(new URL("../../AGENTS.md", import.meta.url), "utf8");
	for (const word of Object.values(VOCABULARY).flat()) assert.ok(rules.includes(`[[${word}]]`), word);
});
