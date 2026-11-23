import { AssistantMessageComponent, UserMessageComponent } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import { color, type Item, label, oneLine, renderTurn, type Turn } from "./picker.ts";

type Node = Component & { children?: Node[] };
type Message = Turn & { component: Node };
// Pi keeps these fields private, so read them through a structural view.
type Internals = { text: string; timestamp?: string; lastMessage?: { content: { type: string; text?: string }[] } };

const sentinel = "\u0000rom-fzf\u0000";

function toMessage(component: Node): Message | undefined {
  const { text, timestamp, lastMessage } = component as unknown as Internals;
  const date = timestamp === undefined ? undefined : new Date(timestamp);
  if (component instanceof UserMessageComponent) return { role: "you", text: text.trim(), date, component };
  if (component instanceof AssistantMessageComponent && lastMessage) {
    const reply = lastMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (reply) return { role: "pi", text: reply, date, component };
  }
}

export function collectMessages(root: Node): Message[] {
  const found: Message[] = [];
  const visit = (node: Node) => {
    const message = toMessage(node);
    if (message) return void found.push(message);
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return found;
}

export const summary = ({ role, text }: Turn) =>
  `${label(role)} ${color("90", "│")} ${oneLine(text.replace(/\*\*|`|\[\[|\]\]|^#+ /gm, ""))}`;

export function messageItem({ role, text, date }: Turn): Item {
  const line = summary({ role, text });
  return { date, line: () => line, preview: (width) => renderTurn({ role, text }, width).join("\n") };
}

export function rowOf(content: Node, target: Node, width: number): number {
  const render = target.render;
  target.render = (w: number) => {
    const lines = render.call(target, w);
    return lines.length ? [sentinel + lines[0], ...lines.slice(1)] : lines;
  };
  try {
    return content.render(width).findIndex((line) => line.includes(sentinel));
  } finally {
    delete (target as Partial<Node>).render;
  }
}
