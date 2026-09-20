import assert from "node:assert/strict";
import test from "node:test";
import { initTheme, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import startupResourceMetrics from "./index.ts";
import type { UsageSnapshot } from "./usage.ts";

initTheme(undefined, false);

type Handler = (...args: any[]) => void;
type HeaderComponent = { render(width: number): string[]; dispose(): void };
type HeaderFactory = (tui: { terminal: { rows: number }; requestRender(): void }, theme: Theme) => HeaderComponent;

const theme = {
  fg: (_color: string, text: string) => text,
  bold: (text: string) => text,
} as Theme;

function registered<T>(handlers: Map<string, T>, name: string): T {
  const handler = handlers.get(name);
  assert.ok(handler, `${name} was not registered`);
  return handler;
}

const usage: UsageSnapshot = {
  days: [{ date: "2025-09-15", cost: 1.25, tokens: 1_200, inputTokens: 20, cacheReadTokens: 60, cacheWriteTokens: 20 }],
  total: { cost: 1.25, tokens: 1_200, inputTokens: 20, cacheReadTokens: 60, cacheWriteTokens: 20 },
  warnings: 0,
};

function setup() {
  const piHandlers = new Map<string, Handler>();
  const eventHandlers = new Map<string, Handler>();
  const pi = {
    events: { on: (name: string, handler: Handler) => eventHandlers.set(name, handler) },
    on: (name: string, handler: Handler) => piHandlers.set(name, handler),
    getActiveTools: () => [],
    getAllTools: () => [],
    getCommands: () => [],
  } as unknown as ExtensionAPI;
  startupResourceMetrics(pi, { loadUsage: async () => usage });
  return { piHandlers, eventHandlers };
}

test("does not install a header outside TUI sessions", () => {
  const { piHandlers } = setup();
  let installs = 0;

  registered(piHandlers, "session_start")({}, {
    mode: "rpc",
    ui: { setHeader: () => installs++ },
  });

  assert.equal(installs, 0);
});

test("captures startup metrics once per session", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { piHandlers, eventHandlers } = setup();
  let factory: HeaderFactory | undefined;
  let renders = 0;
  const context = {
    mode: "tui",
    cwd: "/missing-project",
    model: { contextWindow: 1_000 },
    scopedModels: [],
    getSystemPrompt: () => "default prompt",
    ui: {
      setHeader: (value: HeaderFactory) => { factory = value; },
      getToolsExpanded: () => false,
    },
  };

  registered(piHandlers, "session_start")({}, context);
  assert.ok(factory);
  const component = factory({ terminal: { rows: 40 }, requestRender: () => renders++ }, theme);
  assert.match(component.render(100).join("\n"), /Measuring loaded resources/);

  registered(eventHandlers, "pi-mcp-adapter/status/v1")({
    version: 1,
    servers: [{ name: "startup-server", status: "connected", toolCount: 2, directToolCount: 1 }],
    totalTools: 2,
  });
  t.mock.timers.runAll();
  await Promise.resolve();
  const measured = component.render(100).join("\n");
  assert.match(measured, /Total\s+4/);
  assert.match(measured, /\[Usage\]/);
  assert.match(measured, /Total\s+\$1\.25\s+1\.2k \(60\.0%\)/);
  assert.match(measured, /startup-server \(connected\)\s+2\s+1/);
  assert.equal(piHandlers.has("before_agent_start"), false);
  assert.equal(piHandlers.has("model_select"), false);

  const rendersAfterStartup = renders;
  registered(eventHandlers, "pi-mcp-adapter/status/v1")({
    version: 1,
    servers: [{ name: "later-server", status: "connected", toolCount: 3, directToolCount: 2 }],
    totalTools: 3,
  });
  const unchanged = component.render(100).join("\n");
  assert.match(unchanged, /startup-server/);
  assert.doesNotMatch(unchanged, /later-server/);
  assert.equal(renders, rendersAfterStartup);

  component.dispose();
});
