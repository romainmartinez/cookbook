import assert from "node:assert/strict";
import test from "node:test";
import { initTheme, type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import startupResourceMetrics from "./index.ts";

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
  startupResourceMetrics(pi);
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

test("renders refreshed lifecycle and MCP data until disposal", (t) => {
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

  t.mock.timers.runAll();
  assert.match(component.render(100).join("\n"), /Total\s+4/);

  registered(piHandlers, "before_agent_start")({
    systemPrompt: "x".repeat(400),
    systemPromptOptions: { contextFiles: [{ path: "/context.md", content: "x".repeat(80) }] },
  });
  let output = component.render(100).join("\n");
  assert.match(output, /⚠ 100/);
  assert.match(output, /context\.md\s+20/);

  registered(eventHandlers, "pi-mcp-adapter/status/v1")({
    version: 1,
    servers: [{ name: "server", status: "connected", toolCount: 2, directToolCount: 1 }],
    totalTools: 2,
  });
  output = component.render(100).join("\n");
  assert.match(output, /server \(connected\)\s+2\s+1/);

  const rendersBeforeDispose = renders;
  component.dispose();
  registered(piHandlers, "model_select")();
  registered(eventHandlers, "pi-mcp-adapter/status/v1")({ version: 1, servers: [], totalTools: 0 });
  assert.equal(renders, rendersBeforeDispose);
});
