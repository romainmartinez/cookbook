import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const MAX_TITLE_LENGTH = 40;
type HerdrTarget = { bin: string; tabId: string };

function herdrTarget(): HerdrTarget | undefined {
  const tabId = process.env.HERDR_TAB_ID;
  if (process.env.HERDR_ENV !== "1" || !tabId) return undefined;
  return { bin: process.env.HERDR_BIN_PATH ?? "herdr", tabId };
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part): part is { type: "text"; text: string } =>
      Boolean(part && typeof part === "object" && part.type === "text" && typeof part.text === "string"),
    )
    .map((part) => part.text)
    .join(" ");
}

export function titleFromMessage(message: string): string {
  const normalized = message
    .replace(/^\s*#+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized;

  const bounded = normalized.slice(0, MAX_TITLE_LENGTH + 1);
  const wordBoundary = bounded.lastIndexOf(" ");
  return (wordBoundary > 0 ? bounded.slice(0, wordBoundary) : bounded.slice(0, MAX_TITLE_LENGTH)).trim();
}

function firstUserMessage(ctx: ExtensionContext): string {
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "message" && entry.message.role === "user") {
      return contentText(entry.message.content);
    }
  }
  return "";
}

async function renameHerdrTab(pi: ExtensionAPI, target: HerdrTarget | undefined, title: string): Promise<void> {
  if (!target) return;
  await pi.exec(target.bin, ["tab", "rename", target.tabId, title]);
}

async function applyTitle(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  target: HerdrTarget | undefined,
  candidate = "",
): Promise<void> {
  const existing = pi.getSessionName();
  const title = existing ?? titleFromMessage(candidate);
  if (title && !existing) pi.setSessionName(title);
  await renameHerdrTab(pi, target, title ? `π - ${title}` : "pi");
}

export function installSessionTerminalTitle(pi: ExtensionAPI, target?: HerdrTarget): void {
  pi.on("session_start", (_event, ctx) => applyTitle(pi, ctx, target, firstUserMessage(ctx)));
  pi.on("before_agent_start", (event, ctx) => applyTitle(pi, ctx, target, event.prompt));
  pi.on("session_info_changed", (_event, ctx) => applyTitle(pi, ctx, target));
  pi.on("session_shutdown", async (event) => {
    if (!target || event.reason !== "quit") return;
    await pi.exec(target.bin, ["plugin", "action", "invoke", "--plugin", "herdr-automatic-rename", "reset"]);
  });
}

export default function sessionTerminalTitle(pi: ExtensionAPI): void {
  installSessionTerminalTitle(pi, herdrTarget());
}
