import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI, ExtensionContext, ToolDefinition } from "@earendil-works/pi-coding-agent";
import minimalSubagent from "./index.ts";

type Execute = ToolDefinition["execute"];
type ExecResult = { code: number; stdout: string; stderr: string };

function setup(result: ExecResult) {
  let tool: ToolDefinition | undefined;
  const calls: Array<{ command: string; args: string[]; options: unknown }> = [];
  const pi = {
    registerTool: (value: ToolDefinition) => { tool = value; },
    getThinkingLevel: () => "high",
    exec: async (command: string, args: string[], options: unknown) => {
      calls.push({ command, args, options });
      return result;
    },
  } as unknown as ExtensionAPI;
  minimalSubagent(pi);
  assert.ok(tool);
  return { execute: tool.execute as Execute, calls };
}

function context(trusted = true): ExtensionContext {
  return {
    cwd: "/project",
    model: { provider: "openai", id: "gpt-test" },
    isProjectTrusted: () => trusted,
  } as unknown as ExtensionContext;
}

test("runs an isolated child with the active model and trust policy", async () => {
  const { execute, calls } = setup({ code: 0, stdout: " completed \n", stderr: "" });
  const signal = AbortSignal.timeout(1_000);
  const result = await execute("call", { task: "Review this" }, signal, undefined, context(false));

  assert.equal(result.content[0]?.type, "text");
  assert.equal(result.content[0]?.text, "completed");
  assert.equal(calls[0]?.command, "pi");
  assert.deepEqual(calls[0]?.args, [
    "--print", "--offline", "--no-session", "--no-extensions", "--no-skills",
    "--no-prompt-templates", "--no-themes", "--tools", "read,bash,edit,write",
    "--provider", "openai", "--model", "gpt-test", "--thinking", "high",
    "--no-approve", "--",
    "Review this\n\nKeep the final response under 4,000 characters. Include results, files changed, and validation.",
  ]);
  assert.deepEqual(calls[0]?.options, { cwd: "/project", signal, timeout: 15 * 60 * 1_000 });
});

test("uses bounded stderr when the child fails", async () => {
  const stderr = `start-${"x".repeat(9_000)}-end`;
  const { execute } = setup({ code: 1, stdout: "ignored", stderr });

  await assert.rejects(
    execute("call", { task: "Fail" }, undefined, undefined, context()),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.length, 8_000);
      assert.ok(error.message.startsWith("start-"));
      assert.ok(error.message.includes("[... output truncated ...]"));
      assert.ok(error.message.endsWith("-end"));
      return true;
    },
  );
});

test("returns an error without spawning when no model is active", async () => {
  const { execute, calls } = setup({ code: 0, stdout: "unused", stderr: "" });
  const result = await execute("call", { task: "Review" }, undefined, undefined, {
    ...context(),
    model: undefined,
  });

  assert.deepEqual(result, {
    content: [{ type: "text", text: "No active model is available for the subagent." }],
    details: {},
    isError: true,
  });
  assert.equal(calls.length, 0);
});
