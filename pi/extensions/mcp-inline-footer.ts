import { homedir } from "node:os";
import { sep } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const ansi = /\x1b\[[0-?]*[ -/]*[@-~]/g;

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        invalidate() {},
        dispose: unsubscribe,
        render(width: number): string[] {
          const home = homedir();
          const cwd = ctx.sessionManager.getCwd();
          const path = cwd.startsWith(`${home}${sep}`) ? `~${cwd.slice(home.length)}` : cwd;
          const branch = footerData.getGitBranch();

          const usage = ctx.getContextUsage();
          const context = usage?.tokens == null
            ? "?"
            : `${compact.format(usage.tokens)} (${Math.round(usage.percent ?? 0)}%)`;
          const cost = ctx.sessionManager.getEntries().reduce((total, entry) => {
            if (entry.type !== "message" || !("usage" in entry.message)) return total;
            return total + (entry.message.usage?.cost.total ?? 0);
          }, 0);

          const statuses = [...footerData.getExtensionStatuses().values()].map((status) =>
            status.replace(ansi, ""),
          );
          const left = theme.fg(
            "dim",
            [
              context,
              `$${cost.toFixed(2)}`,
              ...statuses,
              ctx.model?.id ?? "no-model",
              ctx.model?.reasoning && ctx.thinkingLevel,
            ]
              .filter(Boolean)
              .join(" • "),
          );
          const right = theme.fg("dim", `${path}${branch ? ` (${branch})` : ""}`);
          const gap = width - visibleWidth(left) - visibleWidth(right);
          if (gap > 0) return [left + " ".repeat(gap) + right];

          const leftWidth = Math.max(0, width - visibleWidth(right) - 1);
          return [
            leftWidth > 0
              ? `${truncateToWidth(left, leftWidth, "…")} ${right}`
              : truncateToWidth(right, width, "…"),
          ];
        },
      };
    });
  });
}
