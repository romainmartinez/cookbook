import assert from "node:assert/strict";
import { basename } from "node:path";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installRexNotifications } from "./index.ts";

type Handler = (event: any, ctx?: unknown) => void;

function setup(sessionName?: string) {
  const handlers = new Map<string, Handler>();
  const listeners = new Map<string, (data: unknown) => void>();
  const written: string[] = [];
  const pi = {
    on: (name: string, handler: Handler) => handlers.set(name, handler),
    events: { on: (name: string, handler: (data: unknown) => void) => listeners.set(name, handler) },
    getSessionName: () => sessionName,
  } as unknown as ExtensionAPI;
  installRexNotifications(pi, (data) => written.push(data));
  const fire = (name: string, event: unknown = {}, hasUI = true) => handlers.get(name)?.(event, { hasUI });
  const emit = (name: string, data: unknown) => listeners.get(name)?.(data);
  return { fire, emit, written };
}

const label = basename(process.cwd());
const osc9 = (text: string) => `\x1b]9;${text}\x07`;

test("notifies when a run finishes", () => {
  const { fire, written } = setup();
  fire("agent_start");
  fire("message_end", { message: { role: "assistant", stopReason: "stop" } });
  fire("agent_settled", { aborted: false });
  assert.deepEqual(written, [osc9(`π ${label}: Done`)]);
});

test("reports the last error and prefers the session name", () => {
  const { fire, written } = setup("Fix login");
  fire("agent_start");
  fire("message_end", { message: { role: "assistant", stopReason: "error", errorMessage: "Rate limited\ntrace" } });
  fire("agent_settled", { aborted: false });
  assert.deepEqual(written, [osc9("π Fix login: Error: Rate limited")]);
});

test("stays quiet when the run is aborted", () => {
  const { fire, written } = setup();
  fire("agent_settled", { aborted: true });
  assert.deepEqual(written, []);
});

test("stays quiet without a UI", () => {
  const { fire, written } = setup();
  fire("agent_settled", { aborted: false }, false);
  assert.deepEqual(written, []);
});

test("notifies for dialogs but not custom UI", () => {
  const { fire, written } = setup();
  fire("ui_prompt_start", { kind: "confirm", title: "Confirm git push" });
  fire("ui_prompt_start", { kind: "custom" });
  assert.deepEqual(written, [osc9(`π ${label}: Confirm git push`)]);
});

test("notifies with the ask_user_question text on one line", () => {
  const { emit, written } = setup();
  emit("rpiv:ask-user:prompt", { questions: [{ question: "Pick\na database?" }] });
  assert.deepEqual(written, [osc9(`π ${label}: Pick a database?`)]);
});
