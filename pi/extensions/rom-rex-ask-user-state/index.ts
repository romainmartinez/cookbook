import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Prompt = { toolCallId?: string; questions?: ReadonlyArray<{ question?: string }> };
type Blocked = { active?: boolean; toolCallId?: string };
type Write = (data: string) => void;

const MAX_MESSAGE_BYTES = 2048;

function isEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.TERM_PROGRAM === "rex" && env.PI_PROGRAM_STATUS !== "0";
}

function message(prompt: Prompt | undefined): string {
  const text = (prompt?.questions?.[0]?.question ?? "Answer question").replace(/[\x00-\x1f\x7f]+/g, " ").trim();
  const bytes = Buffer.from(text);
  if (bytes.length <= MAX_MESSAGE_BYTES) return bytes.toString("base64");
  return Buffer.from(bytes.subarray(0, MAX_MESSAGE_BYTES).toString().replace(/\uFFFD$/, "")).toString("base64");
}

// Pi dedupes its root program-status record and would not resend `working`, so this uses a child record id.
function recordId(toolCallId: string): string {
  return `ask-user-question/${toolCallId}`;
}

export function installRexAskUserState(pi: ExtensionAPI, write: Write): void {
  const prompts = new Map<string, Prompt>();

  pi.events.on("rpiv:ask-user:prompt", (data) => {
    const prompt = data as Prompt;
    if (prompt.toolCallId) prompts.set(prompt.toolCallId, prompt);
  });

  pi.events.on("rpiv:ask-user:blocked", (data) => {
    const { active, toolCallId } = data as Blocked;
    if (!toolCallId) return;
    const id = recordId(toolCallId);
    if (active) {
      write(`\x1b]7501;state=blocked:kind=question:app=pi:id=${id}:msg=${message(prompts.get(toolCallId))}\x1b\\`);
      return;
    }
    prompts.delete(toolCallId);
    write(`\x1b]7501;state=clear:id=${id}\x1b\\`);
  });
}

export default function rexAskUserState(pi: ExtensionAPI): void {
  if (!isEnabled(process.env)) return;
  installRexAskUserState(pi, (data) => process.stdout.write(data));
}
