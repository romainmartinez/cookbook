import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { browse } from "./browse.ts";
import { withTui } from "./picker.ts";

const openCommand = "fzf-open";

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+t", {
    description: "Browse messages and sessions with fzf, ctrl-t to cycle",
    handler: async (ctx) => {
      if (ctx.mode !== "tui") return;
      const path = await withTui(ctx, (tui) => browse(tui, ctx));
      if (!path) return;
      if (!ctx.isIdle()) return ctx.ui.notify("Pi is busy, open the session when it finishes", "info");
      pi.sendUserMessage(`/${openCommand} ${path}`, { expandPromptTemplates: true });
    },
  });

  // Only command contexts can switch sessions, so ctrl+t hands the picked path to this command.
  pi.registerCommand(openCommand, {
    description: "Open a session picked with ctrl+t",
    handler: async (path, ctx) => {
      if (path.trim()) await ctx.switchSession(path.trim());
    },
  });
}
