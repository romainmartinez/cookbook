import { join } from "node:path";
import {
  getAgentDir,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import {
  collectMetrics,
  type ContextFile,
  type McpStatusSnapshot,
  type MetricsSnapshot,
} from "./metrics.ts";
import { renderHeader } from "./rendering.ts";
import { collectUsage, type UsageSnapshot } from "./usage.ts";

const MCP_STATUS_EVENT = "pi-mcp-adapter/status/v1";

type RefreshHeader = (systemPrompt?: string, contextFiles?: readonly ContextFile[]) => void;
type Options = { loadUsage?: (sessionRoot: string) => Promise<UsageSnapshot> };

export default function (pi: ExtensionAPI, options: Options = {}) {
  let mcpSnapshot: McpStatusSnapshot | undefined;
  let refreshHeader: RefreshHeader | undefined;
  let cachedUsage: UsageSnapshot | null | undefined;
  let usagePromise: Promise<UsageSnapshot> | undefined;

  pi.events.on(MCP_STATUS_EVENT, (data) => {
    const snapshot = data as Partial<McpStatusSnapshot>;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.servers)) return;
    mcpSnapshot = snapshot as McpStatusSnapshot;
    refreshHeader?.();
  });

  pi.on("model_select", () => refreshHeader?.());

  pi.on("before_agent_start", (event) => {
    refreshHeader?.(event.systemPrompt, event.systemPromptOptions.contextFiles ?? []);
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const agentDir = getAgentDir();
    ctx.ui.setHeader((tui, theme) => {
      let snapshot: MetricsSnapshot | undefined;
      let usageSnapshot = cachedUsage;
      let contextFiles: readonly ContextFile[] = [];
      let disposed = false;

      const refresh: RefreshHeader = (systemPrompt = ctx.getSystemPrompt(), nextContextFiles = contextFiles) => {
        if (disposed) return;
        contextFiles = nextContextFiles;
        snapshot = collectMetrics({
          pi,
          agentDir,
          cwd: ctx.cwd,
          systemPrompt,
          contextFiles,
          contextWindow: ctx.model?.contextWindow,
        });
        tui.requestRender();
      };

      refreshHeader = refresh;
      const timer = setTimeout(() => {
        refresh();
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
            mcpSnapshot,
          });
        },
        invalidate() {},
        dispose() {
          disposed = true;
          clearTimeout(timer);
          if (refreshHeader === refresh) refreshHeader = undefined;
        },
      };
    });
  });
}
