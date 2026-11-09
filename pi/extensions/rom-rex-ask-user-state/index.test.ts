import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installRexAskUserState } from "./index.ts";

function setup() {
  const listeners = new Map<string, (data: unknown) => void>();
  const written: string[] = [];
  const pi = {
    events: { on: (name: string, handler: (data: unknown) => void) => listeners.set(name, handler) },
  } as unknown as ExtensionAPI;
  installRexAskUserState(pi, (data) => written.push(data));
  const emit = (name: string, data: unknown) => listeners.get(name)?.(data);
  return { emit, written };
}

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

test("reports a questionnaire as blocked and clears it", () => {
  const { emit, written } = setup();
  emit("rpiv:ask-user:prompt", { toolCallId: "call1", questions: [{ question: "Pick\na database?" }] });
  emit("rpiv:ask-user:blocked", { active: true, toolCallId: "call1" });
  emit("rpiv:ask-user:blocked", { active: false, toolCallId: "call1" });

  assert.deepEqual(written, [
    `\x1b]7501;state=blocked:kind=question:app=pi:id=ask-user-question/call1:msg=${b64("Pick a database?")}\x1b\\`,
    "\x1b]7501;state=clear:id=ask-user-question/call1\x1b\\",
  ]);
});

test("uses a fallback message without a prompt", () => {
  const { emit, written } = setup();
  emit("rpiv:ask-user:blocked", { active: true, toolCallId: "call2" });
  assert.match(written[0], new RegExp(`msg=${b64("Answer question")}`));
});

test("truncates long questions without splitting a character", () => {
  const { emit, written } = setup();
  emit("rpiv:ask-user:prompt", { toolCallId: "call3", questions: [{ question: `a${"é".repeat(2000)}` }] });
  emit("rpiv:ask-user:blocked", { active: true, toolCallId: "call3" });
  assert.match(written[0], new RegExp(`msg=${b64(`a${"é".repeat(1023)}`)}\x1b`));
});

test("ignores events without a tool call id", () => {
  const { emit, written } = setup();
  emit("rpiv:ask-user:blocked", { active: true });
  assert.deepEqual(written, []);
});
