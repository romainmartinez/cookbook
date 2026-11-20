import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { jumpToMessage } from "./messages.ts";
import { hitItem, listHits, listSessions, sessionItem } from "./sessions.ts";
import { pick, withTui } from "./tv.ts";

export default function (pi: ExtensionAPI) {
  pi.registerShortcut("ctrl+t", {
    description: "Jump to a message with television",
    handler: async (ctx) => {
      if (ctx.mode === "tui") await withTui(ctx, (tui) => jumpToMessage(tui, ctx));
    },
  });

  pi.registerCommand("sessions", {
    description: "Resume a session in this project with television, ctrl-t to search their messages",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") return;
      const { sessionManager } = ctx;
      const sessions = await listSessions(sessionManager.getSessionDir(), sessionManager.getSessionFile());
      if (sessions.length === 0) return ctx.ui.notify("No other sessions in this project", "info");
      const path = await withTui(ctx, async (tui) => {
        const picked = await pick(tui, "Sessions  (ctrl-t: messages)", sessions.map(sessionItem), "ctrl-t");
        if (!picked) return;
        if (!picked.key) return sessions[picked.index].path;
        const hits = await listHits(sessions);
        const hit = await pick(tui, "Messages in all sessions", hits.map(hitItem));
        return hit && hits[hit.index].path;
      });
      if (path) await ctx.switchSession(path);
    },
  });

  // Shortcut contexts lack switchSession, so route through the command.
  pi.registerShortcut("ctrl+shift+t", {
    description: "Resume a session in this project with television",
    handler: () => pi.sendUserMessage("/sessions", { expandPromptTemplates: true }),
  });
}
