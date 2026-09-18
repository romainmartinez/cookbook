import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ToolCallEvent } from "@earendil-works/pi-coding-agent";
import gitPushConfirmation from "./index.ts";

type ToolCallHandler = (event: ToolCallEvent, ctx: unknown) => Promise<unknown>;

function setup() {
  let handler: ToolCallHandler | undefined;
  const emitted: Array<{ name: string; data: unknown }> = [];
  const pi = {
    on: (name: string, value: ToolCallHandler) => {
      if (name === "tool_call") handler = value;
    },
    events: {
      emit: (name: string, data: unknown) => emitted.push({ name, data }),
    },
  } as unknown as ExtensionAPI;
  gitPushConfirmation(pi);
  assert.ok(handler);
  return { handler, emitted };
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

test("reports confirmation state and blocks a declined push", async () => {
  const { handler, emitted } = setup();
  const result = await handler(bash("git push origin main"), {
    hasUI: true,
    ui: { confirm: async () => false },
  });

  assert.deepEqual(result, { block: true, reason: "git push declined by user" });
  assert.deepEqual(emitted, [
    { name: "herdr:blocked", data: { active: true, label: "Confirm git push" } },
    { name: "herdr:blocked", data: { active: false } },
  ]);
});

test("clears confirmation state when the UI fails", async () => {
  const { handler, emitted } = setup();
  await assert.rejects(handler(bash("git push"), {
    hasUI: true,
    ui: { confirm: async () => { throw new Error("UI closed"); } },
  }), /UI closed/);

  assert.deepEqual(emitted.at(-1), { name: "herdr:blocked", data: { active: false } });
});
