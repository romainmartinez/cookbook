import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ExtensionAPI, Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import mcpInlineFooter from "./index.ts";

type Handler = (...args: any[]) => void;
type FooterFactory = (...args: any[]) => { render(width: number): string[]; dispose(): void };

const theme = {
  fg: (_color: string, text: string) => `\x1b[36m${text}\x1b[39m`,
} as Theme;

function setup() {
  let sessionStart: Handler | undefined;
  const pi = {
    on: (name: string, handler: Handler) => {
      if (name === "session_start") sessionStart = handler;
    },
  } as unknown as ExtensionAPI;
  mcpInlineFooter(pi);
  assert.ok(sessionStart);
  return sessionStart;
}

test("renders live session metrics and stays within the terminal width", () => {
  const sessionStart = setup();
  let factory: FooterFactory | undefined;
  let branchListener: (() => void) | undefined;
  let unsubscribed = false;
  let renders = 0;
  const ctx = {
    mode: "tui",
    model: { id: "gpt-test", reasoning: true },
    thinkingLevel: "high",
    getContextUsage: () => ({ tokens: 12_500, percent: 42.4 }),
    sessionManager: {
      getCwd: () => join(homedir(), "work", "cookbook"),
      getEntries: () => [
        { type: "message", message: { usage: { cost: { total: 1.25 } } } },
        { type: "message", message: { usage: { cost: { total: 0.5 } } } },
        { type: "compaction", usage: { cost: { total: 99 } } },
      ],
    },
    ui: { setFooter: (value: FooterFactory) => { factory = value; } },
  };

  sessionStart({}, ctx);
  assert.ok(factory);
  const component = factory(
    { requestRender: () => renders++ },
    theme,
    {
      getGitBranch: () => "main",
      getExtensionStatuses: () => new Map([["mcp", "\x1b[31mMCP ready\x1b[39m"]]),
      onBranchChange: (listener: () => void) => {
        branchListener = listener;
        return () => { unsubscribed = true; };
      },
    },
  );

  const wide = component.render(100).join("");
  assert.match(wide, /12\.5K \(42%\).*\$1\.75.*MCP ready.*gpt-test.*high/);
  assert.match(wide, /~\/work\/cookbook \(main\)/);
  assert.ok(!wide.includes("\x1b[31m"));

  const narrow = component.render(24);
  assert.ok(narrow.every((line) => visibleWidth(line) <= 24));
  assert.match(narrow.join(""), /cookbook \(main\)/);

  branchListener?.();
  assert.equal(renders, 1);
  component.dispose();
  assert.equal(unsubscribed, true);
});
