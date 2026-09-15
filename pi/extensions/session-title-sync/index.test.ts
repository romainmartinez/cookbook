import assert from "node:assert/strict";
import test from "node:test";

import { installSessionTerminalTitle, titleFromMessage } from "./index.ts";

type Handler = (event: any, ctx: any) => void | Promise<void>;

function setup(options: { sessionName?: string; firstMessage?: string } = {}) {
  const handlers = new Map<string, Handler>();
  const sessionNames: string[] = [];
  const commands: Array<{ command: string; args: string[] }> = [];
  let sessionName = options.sessionName;
  const pi = {
    getSessionName: () => sessionName,
    setSessionName: (name: string) => {
      sessionName = name;
      sessionNames.push(name);
    },
    exec: async (command: string, args: string[]) => {
      commands.push({ command, args });
      return { stdout: "", stderr: "", code: 0, killed: false };
    },
    on: (event: string, handler: Handler) => handlers.set(event, handler),
  };
  const entries = options.firstMessage === undefined
    ? []
    : [{ type: "message", message: { role: "user", content: [{ type: "text", text: options.firstMessage }] } }];
  const ctx = { sessionManager: { getBranch: () => entries } };

  installSessionTerminalTitle(pi as never, { bin: "herdr", tabId: "w1:t2" });
  return { handlers, commands, sessionNames, ctx };
}

test("normalizes and truncates the first message at a word boundary", () => {
  assert.equal(titleFromMessage("#   Rename   Herdr tabs without including the current folder name"), "Rename Herdr tabs without including the");
});

test("uses an existing session name without the working directory", async () => {
  const { handlers, commands, sessionNames, ctx } = setup({ sessionName: "Rename Herdr tabs" });

  await handlers.get("session_start")?.({}, ctx);

  assert.deepEqual(commands, [{ command: "herdr", args: ["tab", "rename", "w1:t2", "π - Rename Herdr tabs"] }]);
  assert.deepEqual(sessionNames, []);
});

test("names a resumed session from its first user message", async () => {
  const { handlers, commands, sessionNames, ctx } = setup({ firstMessage: "Diagnose slow Pi startup in this repository" });

  await handlers.get("session_start")?.({}, ctx);

  assert.deepEqual(sessionNames, ["Diagnose slow Pi startup in this"]);
  assert.equal(commands[0]?.args.at(-1), "π - Diagnose slow Pi startup in this");
});

test("names a new session from its first expanded prompt", async () => {
  const { handlers, commands, sessionNames, ctx } = setup();

  await handlers.get("before_agent_start")?.({ prompt: "Compare Raycast with Vicinae and identify missing features" }, ctx);

  assert.deepEqual(sessionNames, ["Compare Raycast with Vicinae and"]);
  assert.equal(commands[0]?.args.at(-1), "π - Compare Raycast with Vicinae and");
});

test("uses pi until the first message and releases the tab on quit", async () => {
  const { handlers, commands, ctx } = setup();

  await handlers.get("session_start")?.({}, ctx);
  await handlers.get("session_shutdown")?.({ reason: "reload" }, ctx);
  await handlers.get("session_shutdown")?.({ reason: "quit" }, ctx);

  assert.deepEqual(commands, [
    { command: "herdr", args: ["tab", "rename", "w1:t2", "pi"] },
    { command: "herdr", args: ["plugin", "action", "invoke", "--plugin", "herdr-automatic-rename", "reset"] },
  ]);
});
