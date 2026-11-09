import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Write = (data: string) => void;
type AskUserPrompt = { questions?: ReadonlyArray<{ question?: string }> };

function oneLine(text: string): string {
  return text.replace(/[\x00-\x1f\x7f]+/g, " ").trim();
}

// Rex shows OSC 9 as a native notification even while it's in front, unlike program status.
export function installRexNotifications(pi: ExtensionAPI, write: Write): void {
  let error: string | undefined;

  const notify = (message: string) => {
    const label = pi.getSessionName() ?? basename(process.cwd());
    write(`\x1b]9;${oneLine(`π ${label}: ${message}`)}\x07`);
  };

  pi.on("agent_start", () => {
    error = undefined;
  });

  pi.on("message_end", (event) => {
    const message = event.message;
    if (message.role !== "assistant") return;
    error = message.stopReason === "error" ? (message.errorMessage ?? "error").split("\n")[0] : undefined;
  });

  pi.on("agent_settled", (event, ctx) => {
    if (ctx.hasUI && !event.aborted) notify(error ? `Error: ${error}` : "Done");
  });

  // `custom` prompts also host non-blocking UI, so questions come from the ask-user event below.
  pi.on("ui_prompt_start", (event) => {
    if (event.kind !== "custom") notify(event.title ?? "Waiting for input");
  });

  pi.events.on("rpiv:ask-user:prompt", (data) => {
    notify((data as AskUserPrompt).questions?.[0]?.question ?? "Question");
  });
}

export default function rexNotifications(pi: ExtensionAPI): void {
  if (process.env.TERM_PROGRAM !== "rex") return;
  installRexNotifications(pi, (data) => process.stdout.write(data));
}
