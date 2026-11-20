import assert from "node:assert/strict";
import test from "node:test";
import { collectMessages, messageItem, rowOf } from "./messages.ts";

class Container {
  children: any[];
  constructor(...children: any[]) {
    this.children = children;
  }
  render(width: number): string[] {
    return this.children.flatMap((child) => child.render(width));
  }
}

class Spacer {
  render() {
    return [""];
  }
}

class UserMessageComponent {
  text: string;
  constructor(text: string) {
    this.text = text;
  }
  render() {
    return this.text.split("\n");
  }
}

class AssistantMessageComponent {
  lastMessage: { content: object[] };
  constructor(...content: object[]) {
    this.lastMessage = { content };
  }
  render() {
    return ["assistant", "reply"];
  }
}

test("collects user and assistant text in transcript order", () => {
  const tools = new AssistantMessageComponent({ type: "toolCall" });
  const content = new Container(
    new Container(new UserMessageComponent(" hi \n there ")),
    tools,
    new AssistantMessageComponent({ type: "thinking" }, { type: "text", text: "done" }),
  );

  assert.deepEqual(
    collectMessages(content as any).map(({ role, text }) => [role, text]),
    [["you", "hi \n there"], ["pi", "done"]],
  );
});

test("formats a colored one-line summary without markdown noise", () => {
  const text = "## Result\n**Done** `x` [[Fixed]]\n\tb";
  assert.equal(messageItem({ role: "pi", text }).line(), "\x1b[1;36m pi\x1b[0m \x1b[90m│\x1b[0m Result Done x Fixed b");
});

test("finds the first rendered row of a component and restores render", () => {
  const target = new AssistantMessageComponent({ type: "text", text: "x" });
  const original = target.render;
  const content = new Container(new Spacer(), new UserMessageComponent("a\nb"), new Spacer(), target);

  assert.equal(rowOf(content as any, target as any, 80), 4);
  assert.equal(target.render, original);
});
