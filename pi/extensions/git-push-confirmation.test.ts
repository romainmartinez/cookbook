import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ToolCallEvent } from "@earendil-works/pi-coding-agent";
import gitPushConfirmation from "./git-push-confirmation.ts";

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

test("detects git push commands without matching lookalikes", async () => {
  const blocked = [
    "git push",
    "git -C repo push origin main",
    "env TOKEN=value git push --force-with-lease",
    "echo ready && command git push",
  ];
  const allowed = ["git status", "echo git push", "git pushy", "printf 'git push'", "echo ready | grep push"];

  for (const command of blocked) {
    const { handler } = setup();
    assert.deepEqual(await handler(bash(command), { hasUI: false }), {
      block: true,
      reason: "git push requires interactive confirmation",
    }, command);
  }
  for (const command of allowed) {
    const { handler } = setup();
    assert.equal(await handler(bash(command), { hasUI: false }), undefined, command);
  }
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
