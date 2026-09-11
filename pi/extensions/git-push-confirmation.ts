import { isToolCallEventType, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const gitPushPattern = /(?:^|[\n;&|()]\s*)(?:command\s+|env(?:\s+[^\s=]+=[^\s]+)*\s+)?git(?:\s+(?:-[A-Za-z]+|--(?:git-dir|work-tree|namespace|super-prefix|config-env)(?:=\S+|\s+\S+)|-c\s+\S+|-C\s+\S+))*\s+push(?:\s|$)/;

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;
    if (!gitPushPattern.test(event.input.command)) return;

    if (!ctx.hasUI) {
      return { block: true, reason: "git push requires interactive confirmation" };
    }

    const confirmed = await ctx.ui.confirm(
      "Confirm git push",
      `Allow this command?\n\n${event.input.command}`,
    );

    if (!confirmed) {
      return { block: true, reason: "git push declined by user" };
    }
  });
}
