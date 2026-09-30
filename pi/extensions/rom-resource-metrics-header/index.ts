import { join } from "node:path";
import {
  getAgentDir,
  loadProjectContextFiles,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import {
  collectMcpStatus,
  collectMetrics,
  mcpServerSettings,
  type ContextFile,
  type McpServerSetting,
  type MetricsSnapshot,
} from "./metrics.ts";
import { renderHeader } from "./rendering.ts";
import { collectUsage, type UsageSnapshot } from "./usage.ts";

type Options = {
  loadUsage?: (sessionRoot: string) => Promise<UsageSnapshot>;
  loadContextFiles?: (options: { cwd: string; agentDir: string }) => ContextFile[];
};

export default function (pi: ExtensionAPI, options: Options = {}) {
  let cachedUsage: UsageSnapshot | null | undefined;
  let usagePromise: Promise<UsageSnapshot> | undefined;

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const agentDir = getAgentDir();
    ctx.ui.setHeader((tui, theme) => {
      let snapshot: MetricsSnapshot | undefined;
      let usageSnapshot = cachedUsage;
      let mcpSettings: McpServerSetting[] = [];
      let disposed = false;

      const timer = setTimeout(() => {
        if (disposed) return;
        snapshot = collectMetrics({
          pi,
          agentDir,
          cwd: ctx.cwd,
          systemPrompt: ctx.getSystemPrompt(),
          contextFiles: (options.loadContextFiles ?? loadProjectContextFiles)({ cwd: ctx.cwd, agentDir }),
          contextWindow: ctx.model?.contextWindow,
        });
        mcpSettings = mcpServerSettings({
          pi,
          agentDir,
          cwd: ctx.cwd,
          projectTrusted: ctx.isProjectTrusted(),
        });
        tui.requestRender();
        usagePromise ??= (options.loadUsage ?? collectUsage)(join(agentDir, "sessions"));
        void usagePromise.then(
          (usage) => {
            cachedUsage = usage;
            usageSnapshot = usage;
            if (!disposed) tui.requestRender();
          },
          () => {
            cachedUsage = null;
            usageSnapshot = null;
            if (!disposed) tui.requestRender();
          },
        );
      }, 0);

      return {
        render(width: number): string[] {
          return renderHeader({
            width,
            terminalHeight: tui.terminal.rows,
            theme,
            expanded: ctx.ui.getToolsExpanded(),
            modelScope: ctx.scopedModels.map(({ model, thinkingLevel }) =>
              `${model.id}${thinkingLevel ? `:${thinkingLevel}` : ""}`
            ),
            snapshot,
            usageSnapshot,
            mcpSnapshot: snapshot ? collectMcpStatus(pi.getAllTools(), mcpSettings) : undefined,
          });
        },
        invalidate() {},
        dispose() {
          disposed = true;
          clearTimeout(timer);
        },
      };
    });
  });
}
