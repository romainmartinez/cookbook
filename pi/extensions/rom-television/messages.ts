import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { color, type Item, label, oneLine, pick, renderTurn, type Turn } from "./tv.ts";

type Node = { render(width: number): string[]; children?: Node[]; constructor: { name: string } };
type Message = Turn & { date?: Date; component: Node };

const sentinel = "\u0000rom-television\u0000";

function toMessage(component: any): Message | undefined {
  const name = component.constructor?.name;
  const date = component.timestamp === undefined ? undefined : new Date(component.timestamp);
  if (name === "UserMessageComponent" && typeof component.text === "string") {
    return { role: "you", text: component.text.trim(), date, component };
  }
  if (name === "AssistantMessageComponent" && component.lastMessage) {
    const text = component.lastMessage.content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n")
      .trim();
    if (text) return { role: "pi", text, date, component };
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

export function messageItem({ role, text, date }: Message): Item {
  const line = `${label(role)} ${color("90", "│")} ${oneLine(text.replace(/\*\*|`|\[\[|\]\]|^#+ /gm, ""))}`;
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

export async function jumpToMessage(tui: any, ctx: ExtensionContext) {
  if (tui.mode !== "fullscreen") return ctx.ui.notify("Message picker needs fullscreen mode", "warning");
  const scrollView = tui.getPrimaryScrollView();
  const messages = collectMessages(scrollView.child);
  if (messages.length === 0) return ctx.ui.notify("No messages to pick", "info");

  const index = await pick(tui, "Messages", messages.map(messageItem));
  if (index === undefined) return;
  const row = rowOf(scrollView.child, messages[index].component, scrollView.getContentWidth(tui.terminal.columns));
  if (row >= 0) scrollView.scrollTo(row);
}
