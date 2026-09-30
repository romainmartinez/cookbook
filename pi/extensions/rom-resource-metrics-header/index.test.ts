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

type Tool = ReturnType<ExtensionAPI["getAllTools"]>[number];

function mcpTool(server: string, name: string, exposure: Tool["exposure"]): Tool {
  return {
    name: `mcp__${server}__${name}`,
    description: "",
    parameters: {},
    exposure,
    namespace: { name: `mcp__${server}`, description: "" },
  } as unknown as Tool;
}

function setup() {
  const piHandlers = new Map<string, Handler>();
  const tools: Tool[] = [];
  const pi = {
    on: (name: string, handler: Handler) => piHandlers.set(name, handler),
    getActiveTools: () => [],
    getAllTools: () => tools,
    getCommands: () => [],
    getMcpServers: () => [],
  } as unknown as ExtensionAPI;
  startupResourceMetrics(pi, {
    loadUsage: async () => usage,
    loadContextFiles: ({ cwd }) => [{ path: `${cwd}/AGENTS.md`, content: "12345678" }],
  });
  return { piHandlers, tools };
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
  const { piHandlers, tools } = setup();
  let factory: HeaderFactory | undefined;
  let renders = 0;
  const context = {
    mode: "tui",
    cwd: "/missing-project",
    model: { contextWindow: 1_000 },
    scopedModels: [],
    getSystemPrompt: () => "default prompt",
    isProjectTrusted: () => false,
    ui: {
      setHeader: (value: HeaderFactory) => { factory = value; },
      getToolsExpanded: () => false,
    },
  };

  registered(piHandlers, "session_start")({}, context);
  assert.ok(factory);
  const component = factory({ terminal: { rows: 40 }, requestRender: () => renders++ }, theme);
  assert.match(component.render(100).join("\n"), /Measuring loaded resources/);

  tools.push(mcpTool("startup-server", "a", "direct"), mcpTool("startup-server", "b", "codemode"));
  t.mock.timers.runAll();
  await Promise.resolve();
  const measured = component.render(100).join("\n");
  assert.match(measured, /Total\s+4/);
  assert.match(measured, /\[Usage\]/);
  assert.match(measured, /Total\s+\$1\.25\s+1\.2k \(60\.0%\)/);
  assert.match(measured, /startup-server \(connected\)\s+2\s+1/);
  assert.match(measured, /\/missing-project\/AGENTS\.md\s+2/);
  assert.equal(piHandlers.has("before_agent_start"), false);
  assert.equal(piHandlers.has("model_select"), false);

  const rendersAfterStartup = renders;
  tools.push(mcpTool("later-server", "c", "codemode"));
  const updated = component.render(100).join("\n");
  assert.match(updated, /startup-server \(connected\)\s+2\s+1/);
  assert.match(updated, /later-server \(connected\)\s+1\s+0/);
  assert.match(updated, /Total\s+4/);
  assert.equal(renders, rendersAfterStartup);

  component.dispose();
});
