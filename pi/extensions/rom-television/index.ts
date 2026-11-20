import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { jumpToMessage } from "./messages.ts";
import { listSessions, sessionItem } from "./sessions.ts";
import { pick, withTui } from "./tv.ts";

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+t", {
    description: "Jump to a message with television",
    handler: async (ctx) => {
      if (ctx.mode === "tui") await withTui(ctx, (tui) => jumpToMessage(tui, ctx));
    },
  });

  pi.registerCommand("sessions", {
    description: "Resume a session in this project with television",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") return;
      const { sessionManager } = ctx;
      const sessions = await listSessions(sessionManager.getSessionDir(), sessionManager.getSessionFile());
      if (sessions.length === 0) return ctx.ui.notify("No other sessions in this project", "info");
      const index = await withTui(ctx, (tui) => pick(tui, "Sessions", sessions.map(sessionItem)));
      if (index !== undefined) await ctx.switchSession(sessions[index].path);
    },
  });

  // Shortcut contexts lack switchSession, so route through the command.
  pi.registerShortcut("ctrl+shift+t", {
    description: "Resume a session in this project with television",
    handler: () => pi.sendUserMessage("/sessions", { expandPromptTemplates: true }),
  });
}
