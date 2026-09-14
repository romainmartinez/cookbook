import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const MAX_OUTPUT_CHARS = 8_000;
const TIMEOUT_MS = 15 * 60 * 1_000;

function limitOutput(text: string): string {
  if (text.length <= MAX_OUTPUT_CHARS) return text;

  const marker = "\n\n[... output truncated ...]\n\n";
  const available = MAX_OUTPUT_CHARS - marker.length;
  const head = Math.ceil(available / 2);
  return text.slice(0, head) + marker + text.slice(-Math.floor(available / 2));
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "subagent",
    label: "Subagent",
    description: "Delegate a focused coding task to an isolated Pi process and return its final response.",
    parameters: Type.Object({
      task: Type.String({ description: "Self-contained task for the child agent" }),
    }),
    async execute(_id, { task }, signal, _onUpdate, ctx) {
      if (!ctx.model) {
        return {
          content: [{ type: "text", text: "No active model is available for the subagent." }],
          details: {},
          isError: true,
        };
      }

      const result = await pi.exec(
        "pi",
        [
          "--print",
          "--offline",
          "--no-session",
          "--no-extensions",
          "--no-skills",
          "--no-prompt-templates",
          "--no-themes",
          "--tools",
          "read,bash,edit,write",
          "--provider",
          ctx.model.provider,
          "--model",
          ctx.model.id,
          "--thinking",
          pi.getThinkingLevel(),
          ctx.isProjectTrusted() ? "--approve" : "--no-approve",
          "--",
          `${task}\n\nKeep the final response under 4,000 characters. Include results, files changed, and validation.`,
        ],
        { cwd: ctx.cwd, signal, timeout: TIMEOUT_MS },
      );

      const stdout = result.stdout.trim();
      const stderr = result.stderr.trim();
      const failed = result.code !== 0;
      const text = failed
        ? stderr || stdout || `Subagent exited with code ${result.code}.`
        : stdout || "Subagent completed without a final response.";

      if (failed) throw new Error(limitOutput(text));

      return {
        content: [{ type: "text", text: limitOutput(text) }],
        details: { code: result.code },
      };
    },
  });
}
