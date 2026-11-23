import assert from "node:assert/strict";
import test from "node:test";
import { AssistantMessageComponent, initTheme, UserMessageComponent } from "@earendil-works/pi-coding-agent";
import { Container, Spacer } from "@earendil-works/pi-tui";
import { collectMessages, messageItem, rowOf } from "./messages.ts";

initTheme("dark");

const container = (...children: any[]) => {
  const node = new Container();
  for (const child of children) node.addChild(child);
  return node;
};
const assistant = (...content: object[]) => new AssistantMessageComponent({ role: "assistant", content } as any);

test("collects user and assistant text in transcript order", () => {
  const content = container(
    container(new UserMessageComponent(" hi \n there ")),
    assistant({ type: "toolCall" }),
    assistant({ type: "thinking", thinking: "hm" }, { type: "text", text: "done" }),
  );

  assert.deepEqual(
    collectMessages(content).map(({ role, text }) => [role, text]),
    [["you", "hi \n there"], ["pi", "done"]],
  );
});

test("reads the message timestamp", () => {
  const [message] = collectMessages(new UserMessageComponent("hi", undefined, undefined, undefined, undefined, "2026-11-19T10:00:00Z"));
  assert.deepEqual(message.date, new Date("2026-11-19T10:00:00Z"));
});

test("formats a colored one-line summary without markdown noise", () => {
  const text = "## Result\n**Done** `x` [[Fixed]]\n\tb";
  assert.equal(messageItem({ role: "pi", text }).line(), "\x1b[1;36m pi\x1b[0m \x1b[90m│\x1b[0m Result Done x Fixed b");
});

test("finds the first rendered row of a component and restores render", () => {
  const target = assistant({ type: "text", text: "x" });
  const original = target.render;
  const user = new UserMessageComponent("a\nb");
  const content = container(new Spacer(1), user, new Spacer(1), target);

  assert.equal(rowOf(content, target, 80), 2 + user.render(80).length);
  assert.equal(target.render, original);
});
