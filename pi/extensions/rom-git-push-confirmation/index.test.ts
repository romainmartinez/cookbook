import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ToolCallEvent } from "@earendil-works/pi-coding-agent";
import gitPushConfirmation from "./index.ts";

type ToolCallHandler = (event: ToolCallEvent, ctx: unknown) => Promise<unknown>;

function setup() {
  let handler: ToolCallHandler | undefined;
  const pi = {
    on: (name: string, value: ToolCallHandler) => {
      if (name === "tool_call") handler = value;
    },
  } as unknown as ExtensionAPI;
  gitPushConfirmation(pi);
  assert.ok(handler);
  return { handler };
}

function bash(command: string): ToolCallEvent {
  return { type: "tool_call", toolCallId: "call", toolName: "bash", input: { command } };
}

test("blocks direct and wrapped pushes without a UI", async () => {
  for (const command of ["git push", "sudo git push"]) {
    const { handler } = setup();
    assert.deepEqual(await handler(bash(command), { hasUI: false }), {
      block: true,
      reason: "git push requires interactive confirmation",
    }, command);
  }
});

test("allows commands without git push", async () => {
  const { handler } = setup();
  assert.equal(await handler(bash("git status"), { hasUI: false }), undefined);
});

test("blocks a declined push", async () => {
  const { handler } = setup();
  const result = await handler(bash("git push origin main"), {
    hasUI: true,
    ui: { confirm: async () => false },
  });

  assert.deepEqual(result, { block: true, reason: "git push declined by user" });
});

test("allows a confirmed push", async () => {
  const { handler } = setup();
  const result = await handler(bash("git push"), { hasUI: true, ui: { confirm: async () => true } });
  assert.equal(result, undefined);
});
