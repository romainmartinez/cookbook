import assert from "node:assert/strict";
import test from "node:test";
import { initTheme, type Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import type { McpStatusSnapshot, MetricsSnapshot } from "./metrics.ts";
import { renderHeader } from "./rendering.ts";

initTheme(undefined, false);

const plainTheme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
} as Theme;

const ansiTheme = {
  fg: (_color: string, text: string) => `\x1b[36m${text}\x1b[39m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
} as Theme;

const snapshot: MetricsSnapshot = {
  systemPrompt: 900,
  systemPromptWarning: true,
  context: [
    { label: "small-context.md", value: 20 },
    { label: "large-context.md", value: 8_000, warning: true },
    { label: "medium-context.md", value: 200 },
  ],
  skills: [
    { label: "visible", descriptionTokens: 15, bodyTokens: 100 },
    { label: "hidden", descriptionTokens: undefined, bodyTokens: 50 },
  ],
  prompts: [{ label: "/standup", value: 30 }],
  tools: [
    { label: "tiny", value: 10 },
    { label: "huge", value: 4_000, warning: true },
    { label: "medium", value: 100 },
  ],
  extensions: ["z-extension", "a-extension", "a-extension"],
};

const mcpSnapshot: McpStatusSnapshot = {
  version: 1,
  servers: [
    { name: "zeta", status: "failed", toolCount: 2, directToolCount: 1 },
    { name: "alpha", status: "connected", toolCount: 5, directToolCount: 3 },
    { name: "beta", status: "disabled", toolCount: 0, directToolCount: 0 },
  ],
  totalTools: 7,
};

function render(overrides: Partial<Parameters<typeof renderHeader>[0]> = {}): string[] {
  return renderHeader({
    width: 60,
    terminalHeight: 40,
    expanded: false,
    modelScope: [],
    snapshot,
    mcpSnapshot,
    theme: plainTheme,
    ...overrides,
  });
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

test("renders useful loading and empty states", () => {
  const loading = render({ snapshot: undefined });
  assert.ok(loading.some((line) => line.includes("Measuring loaded resources…")));

  const emptySnapshot: MetricsSnapshot = {
    systemPrompt: 0,
    systemPromptWarning: false,
    context: [],
    skills: [],
    prompts: [],
    tools: [],
    extensions: [],
  };
  const empty = render({ snapshot: emptySnapshot, mcpSnapshot: undefined }).join("\n");
  assert.ok(empty.includes("[System prompt]"));
  assert.ok(!empty.includes("[Context]"));
  assert.ok(!empty.includes("[MCP servers]"));
});

test("narrow rendering preserves resource semantics", () => {
  const lines = render({ width: 48 });
  const output = lines.join("\n");

  for (const heading of ["[Context]", "[Skills]", "[Tools]", "[MCP servers]", "[Extensions]"]) {
    assert.ok(output.includes(heading), `missing ${heading}`);
  }
  assert.match(output, /⚠ 900/);
  assert.match(output, /Total\s+⚠ 8220/);
  assert.match(output, /hidden\s+hidden\s+50/);
  assert.match(output, /alpha \(connected\)\s+5\s+3/);
  assert.equal(output.match(/a-extension/g)?.length, 1);
  assert.ok(lines.every((line) => visibleWidth(line) <= 48));
});

test("column breakpoint and ANSI-aware wrapping respect width without losing labels", () => {
  const contextLabel = "资料/非常长的上下文路径/that-must-wrap-reliably.md";
  const extensionLabel = "an-extension-name-that-is-much-longer-than-a-column";
  const longSnapshot: MetricsSnapshot = {
    ...snapshot,
    context: [{ label: contextLabel, value: 12 }],
    extensions: [extensionLabel],
  };

  const narrow = render({ width: 67, snapshot: longSnapshot, theme: ansiTheme });
  const wide = render({ width: 68, terminalHeight: 24, snapshot: longSnapshot, theme: ansiTheme });
  const wider = render({ width: 96, terminalHeight: 24, snapshot: longSnapshot, theme: ansiTheme });

  assert.ok(narrow.every((line) => (stripAnsi(line).match(/\[[^\]]+\]/g)?.length ?? 0) <= 1));
  assert.ok(wide.some((line) => (stripAnsi(line).match(/\[[^\]]+\]/g)?.length ?? 0) >= 2));

  for (const [width, lines] of [[67, narrow], [68, wide], [96, wider]] as const) {
    assert.ok(lines.every((line) => visibleWidth(line) <= width), `line exceeded width ${width}`);
    const compactOutput = stripAnsi(lines.join("")).replace(/\s/g, "");
    assert.ok(compactOutput.includes("资料/非常长的上下文路径"), compactOutput);
    assert.ok(compactOutput.includes("/that-must-wrap-reliably.md"), compactOutput);
    assert.ok(compactOutput.includes(extensionLabel), compactOutput);
  }
});
