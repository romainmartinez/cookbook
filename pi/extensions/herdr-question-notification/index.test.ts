import assert from "node:assert/strict";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import herdrQuestionNotification from "./index.ts";

type Handler = (event: { title?: string }, ctx: unknown) => void;

function setup() {
  const handlers = new Map<string, Handler>();
  const emitted: Array<{ name: string; data: unknown }> = [];
  const pi = {
    on: (name: string, handler: Handler) => handlers.set(name, handler),
    events: {
      emit: (name: string, data: unknown) => emitted.push({ name, data }),
    },
  } as unknown as ExtensionAPI;

  herdrQuestionNotification(pi);
  return { handlers, emitted };
}

test("reports Pi UI prompts as Herdr blocked state", () => {
  const { handlers, emitted } = setup();

  handlers.get("ui_prompt_start")?.({ title: "Choose a database" }, {});
  handlers.get("ui_prompt_end")?.({}, {});

  assert.deepEqual(emitted, [
    { name: "herdr:blocked", data: { active: true, label: "Choose a database" } },
    { name: "herdr:blocked", data: { active: false } },
  ]);
});

test("uses a fallback label for untitled prompts", () => {
  const { handlers, emitted } = setup();

  handlers.get("ui_prompt_start")?.({}, {});

  assert.deepEqual(emitted, [
    { name: "herdr:blocked", data: { active: true, label: "Answer question" } },
  ]);
});
