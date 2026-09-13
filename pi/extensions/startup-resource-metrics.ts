import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, sep } from "node:path";
import {
  CONFIG_DIR_NAME,
  VERSION,
  getAgentDir,
  keyHint,
  keyText,
  loadProjectContextFiles,
  parseFrontmatter,
  rawKeyHint,
  stripFrontmatter,
  type ExtensionAPI,
  type Theme,
} from "@earendil-works/pi-coding-agent";
import { visibleWidth, wrapTextWithAnsi, type Keybinding } from "@earendil-works/pi-tui";

type Metric = { label: string; value: number; warning?: boolean };
type SkillMetric = { label: string; descriptionTokens: number | undefined; bodyTokens: number };
type McpStatusSnapshot = {
  version: 1;
  servers: ReadonlyArray<{
    name: string;
    status: "connected" | "cached" | "failed" | "needs-auth" | "not-connected" | "disabled";
    toolCount: number;
    directToolCount: number;
  }>;
  totalTools: number;
};
type MetricsSnapshot = {
  systemPrompt: number;
  systemPromptWarning: boolean;
  context: Metric[];
  skills: SkillMetric[];
  prompts: Metric[];
  tools: Metric[];
  extensions: string[];
};
type PackageSetting = string | { source: string; extensions?: string[] };

const MCP_STATUS_EVENT = "pi-mcp-adapter/status/v1";
const LARGE_CONTEXT_TOKENS = 8_000;
const LARGE_TOOL_TOKENS = 4_000;
const SYSTEM_PROMPT_CONTEXT_RATIO = 0.1;
const MAX_METRIC_TABLE_WIDTH = 56;
const MIN_COLUMN_WIDTH = 32;
const COLUMN_GAP = 4;

function estimatedTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function displayPath(path: string): string {
  const home = homedir();
  return path === home ? "~" : path.startsWith(`${home}${sep}`) ? `~${path.slice(home.length)}` : path;
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function extensionFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isFile() || entry.isSymbolicLink()) {
      return [".ts", ".js", ".mjs", ".cjs"].includes(extname(entry.name)) ? [path] : [];
    }
    const index = ["index.ts", "index.js", "index.mjs", "index.cjs"]
      .map((name) => join(path, name))
      .find(existsSync);
    return index ? [index] : [];
  });
}

function npmPackageName(source: string): string | undefined {
  if (!source.startsWith("npm:")) return undefined;
  const spec = source.slice(4);
  if (spec.startsWith("@")) {
    const slash = spec.indexOf("/");
    const version = spec.indexOf("@", slash);
    return version === -1 ? spec : spec.slice(0, version);
  }
  const version = spec.lastIndexOf("@");
  return version <= 0 ? spec : spec.slice(0, version);
}

function packageExtensionLabel(agentDir: string, setting: PackageSetting): string | undefined {
  const source = typeof setting === "string" ? setting : setting.source;
  const packageName = npmPackageName(source);
  if (!packageName || (typeof setting !== "string" && setting.extensions?.length === 0)) return undefined;

  const root = join(agentDir, "npm", "node_modules", packageName);
  const manifestPath = join(root, "package.json");
  if (!existsSync(manifestPath)) return undefined;

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      pi?: { extensions?: string[] };
    };
    const configured = typeof setting === "string" ? undefined : setting.extensions;
    const declared = configured ?? manifest.pi?.extensions;
    if (declared) {
      return declared.some((path) => !path.startsWith("!") && !path.startsWith("-"))
        ? source.slice(4)
        : undefined;
    }
    return existsSync(join(root, "extensions")) ? source.slice(4) : undefined;
  } catch {
    return undefined;
  }
}

function localExtensionLabels(agentDir: string, cwd: string): string[] {
  const paths = [
    ...extensionFiles(join(agentDir, "extensions")),
    ...extensionFiles(join(cwd, CONFIG_DIR_NAME, "extensions")),
  ];
  return paths.map((path) => basename(path));
}

function packageExtensionLabels(agentDir: string): string[] {
  try {
    const settings = JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8")) as {
      packages?: PackageSetting[];
    };
    return (settings.packages ?? [])
      .map((setting) => packageExtensionLabel(agentDir, setting))
      .filter((label): label is string => label !== undefined);
  } catch {
    return [];
  }
}

function toolMetrics(pi: ExtensionAPI): Metric[] {
  const active = new Set(pi.getActiveTools());
  return pi.getAllTools().filter((tool) => active.has(tool.name)).map((tool) => {
    const value = estimatedTokens(JSON.stringify({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
    return { label: tool.name, value, warning: value >= LARGE_TOOL_TOKENS };
  });
}

function skillMetrics(pi: ExtensionAPI): SkillMetric[] {
  const commands = pi.getCommands().filter((command) => command.source === "skill");
  const seen = new Set<string>();
  const skills = commands.flatMap((command) => {
    const path = command.sourceInfo.path;
    if (seen.has(path)) return [];
    seen.add(path);
    const content = safeRead(path);
    const { frontmatter, body } = parseFrontmatter<{ "disable-model-invocation"?: boolean }>(content);
    const name = command.name.replace(/^skill:/, "");
    return [{
      name,
      description: command.description ?? "",
      disableModelInvocation: frontmatter["disable-model-invocation"] === true,
      body,
    }];
  });
  return skills.map((skill) => ({
    label: skill.name,
    descriptionTokens: skill.disableModelInvocation ? undefined : estimatedTokens(skill.description),
    bodyTokens: estimatedTokens(skill.body.trim()),
  }));
}

function promptMetrics(pi: ExtensionAPI): Metric[] {
  const seen = new Set<string>();
  return pi.getCommands().filter((command) => command.source === "prompt").flatMap((command) => {
    const path = command.sourceInfo.path;
    if (seen.has(path)) return [];
    seen.add(path);
    return [{ label: `/${command.name}`, value: estimatedTokens(stripFrontmatter(safeRead(path))) }];
  });
}

function baseWelcome(expanded: boolean, width: number, theme: Theme): string[] {
  const hint = (keybinding: Keybinding, description: string) => keyHint(keybinding, description);
  const expandedInstructions = [
    hint("app.interrupt", "to interrupt"),
    hint("app.clear", "to clear"),
    rawKeyHint(`${keyText("app.clear")} twice`, "to exit"),
    hint("app.exit", "to exit (empty)"),
    hint("app.suspend", "to suspend"),
    keyHint("tui.editor.deleteToLineEnd", "to delete to end"),
    hint("app.thinking.cycle", "to cycle thinking level"),
    rawKeyHint(`${keyText("app.model.cycleForward")}/${keyText("app.model.cycleBackward")}`, "to cycle models"),
    hint("app.model.select", "to select model"),
    hint("app.tools.expand", "to expand tools"),
    hint("app.thinking.toggle", "to expand thinking"),
    hint("app.editor.external", "for external editor"),
    rawKeyHint("/", "for commands"),
    rawKeyHint("!", "to run bash"),
    rawKeyHint("!!", "to run bash (no context)"),
    hint("app.message.followUp", "to queue follow-up"),
    hint("app.message.dequeue", "to edit all queued messages"),
    hint("app.clipboard.pasteImage", "to paste image (with text fallback)"),
    rawKeyHint("drop files", "to attach"),
  ];
  const compactInstructions = [
    hint("app.interrupt", "interrupt"),
    rawKeyHint(`${keyText("app.clear")}/${keyText("app.exit")}`, "clear/exit"),
    rawKeyHint("/", "commands"),
    rawKeyHint("!", "bash"),
    hint("app.tools.expand", "more"),
  ].join(theme.fg("muted", " · "));
  const onboarding = "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.";
  const content = expanded
    ? [theme.bold(theme.fg("accent", "π")) + theme.fg("dim", ` v${VERSION}`), ...expandedInstructions, "", theme.fg("dim", onboarding)]
    : [
        theme.bold(theme.fg("accent", "π")) + theme.fg("dim", ` v${VERSION}`),
        ...wrapTextWithAnsi(compactInstructions, Math.max(1, width - 2)),
        theme.fg("dim", `Press ${keyText("app.tools.expand")} to show full startup help and loaded resources.`),
        "",
        theme.fg("dim", onboarding),
      ];
  return content.map((line) => line ? ` ${line}` : line);
}

function formatMetricRow(label: string, value: string, width: number, indent = 0): string[] {
  const tableWidth = Math.min(width, MAX_METRIC_TABLE_WIDTH);
  const prefix = " ".repeat(Math.min(indent, Math.max(0, tableWidth - 1)));
  const contentWidth = Math.max(1, tableWidth - prefix.length);
  const labelWidth = contentWidth - visibleWidth(value) - 1;
  if (labelWidth < 1) {
    return wrapTextWithAnsi(`${label} ${value}`, contentWidth).map((line) => `${prefix}${line}`);
  }

  return wrapTextWithAnsi(label, labelWidth).map((line, index) => {
    if (index > 0) return `${prefix}${line}`;
    const gap = " ".repeat(contentWidth - visibleWidth(line) - visibleWidth(value));
    return `${prefix}${line}${gap}${value}`;
  });
}

function formatTwoMetricRow(
  label: string,
  firstValue: string,
  secondValue: string,
  firstWidth: number,
  secondWidth: number,
  width: number,
  indent = 0,
): string[] {
  const tableWidth = Math.min(width, MAX_METRIC_TABLE_WIDTH);
  const prefix = " ".repeat(Math.min(indent, Math.max(0, tableWidth - 1)));
  const contentWidth = Math.max(1, tableWidth - prefix.length);
  const columnsWidth = firstWidth + 2 + secondWidth;
  const labelWidth = contentWidth - columnsWidth - 1;
  if (labelWidth < 1) {
    return wrapTextWithAnsi(`${label} ${firstValue} ${secondValue}`, contentWidth).map((line) => `${prefix}${line}`);
  }

  return wrapTextWithAnsi(label, labelWidth).map((line, index) => {
    if (index > 0) return `${prefix}${line}`;
    const gap = " ".repeat(contentWidth - visibleWidth(line) - columnsWidth);
    const firstPadding = " ".repeat(firstWidth - visibleWidth(firstValue));
    const secondPadding = " ".repeat(secondWidth - visibleWidth(secondValue));
    return `${prefix}${line}${gap}${firstPadding}${firstValue}  ${secondPadding}${secondValue}`;
  });
}

function formatSection(
  title: string,
  metrics: Metric[],
  formatValue: (value: number) => string,
  width: number,
  theme: Theme,
  totalWarningThreshold?: number,
): string[] {
  if (metrics.length === 0) return [];
  const ordered = [...metrics].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const total = metrics.reduce((sum, item) => sum + item.value, 0);
  const items = [
    ...(metrics.length > 2 ? formatMetricRow(
      theme.fg("dim", "Total"),
      theme.fg(
        "dim",
        `${totalWarningThreshold !== undefined && total >= totalWarningThreshold ? "⚠ " : ""}${formatValue(total)}`,
      ),
      width,
      2,
    ) : []),
    ...ordered.flatMap((item) => formatMetricRow(
      theme.fg("dim", item.label),
      theme.fg("dim", `${item.warning ? "⚠ " : ""}${formatValue(item.value)}`),
      width,
      2,
    )),
  ];
  return [
    ...formatMetricRow(
      theme.fg("mdHeading", `[${title}]`),
      theme.fg("dim", "Tokens"),
      width,
    ),
    ...items,
  ];
}

function formatListSection(title: string, labels: string[], width: number, theme: Theme): string[] {
  if (labels.length === 0) return [];
  const items = [...new Set(labels)].sort().flatMap((label) =>
    wrapTextWithAnsi(theme.fg("dim", label), Math.max(1, width - 2)).map((line) => `  ${line}`),
  );
  return [
    theme.fg("mdHeading", `[${title}]`),
    ...items,
  ];
}

function renderColumns(
  sections: Array<{ lines: string[]; column?: 0 | 1 }>,
  leftWidth: number,
  gap: number,
): string[] {
  const columns: [string[], string[]] = [[], []];

  for (const section of sections) {
    if (section.lines.length === 0) continue;
    const column = section.column ?? (columns[0].length <= columns[1].length ? 0 : 1);
    if (columns[column].length > 0) columns[column].push("");
    columns[column].push(...section.lines);
  }

  const height = Math.max(columns[0].length, columns[1].length);
  const separator = " ".repeat(gap);
  return Array.from({ length: height }, (_, index) => {
    const left = columns[0][index] ?? "";
    const right = columns[1][index] ?? "";
    return `${left}${" ".repeat(leftWidth - visibleWidth(left))}${separator}${right}`.trimEnd();
  });
}

function formatMcpSection(snapshot: McpStatusSnapshot | undefined, width: number, theme: Theme): string[] {
  if (!snapshot || snapshot.servers.length === 0) return [];
  const ordered = [...snapshot.servers].sort((a, b) => a.name.localeCompare(b.name));
  const directTotal = snapshot.servers.reduce((sum, server) => sum + server.directToolCount, 0);
  const toolWidth = Math.max("Tools".length, String(snapshot.totalTools).length);
  const directWidth = Math.max("Direct".length, String(directTotal).length);
  const items = [
    ...(snapshot.servers.length > 2 ? formatTwoMetricRow(
      theme.fg("dim", "Total"),
      theme.fg("dim", String(snapshot.totalTools)),
      theme.fg("dim", String(directTotal)),
      toolWidth,
      directWidth,
      width,
      2,
    ) : []),
    ...ordered.flatMap((server) => formatTwoMetricRow(
      theme.fg("dim", `${server.name} (${server.status})`),
      theme.fg("dim", String(server.toolCount)),
      theme.fg("dim", String(server.directToolCount)),
      toolWidth,
      directWidth,
      width,
      2,
    )),
  ];
  return [
    ...formatTwoMetricRow(
      theme.fg("mdHeading", "[MCP servers]"),
      theme.fg("dim", "Tools"),
      theme.fg("dim", "Direct"),
      toolWidth,
      directWidth,
      width,
    ),
    ...items,
  ];
}

function formatSkillSection(metrics: SkillMetric[], width: number, theme: Theme): string[] {
  if (metrics.length === 0) return [];
  const ordered = [...metrics].sort((a, b) =>
    (b.descriptionTokens ?? -1) - (a.descriptionTokens ?? -1) || b.bodyTokens - a.bodyTokens || a.label.localeCompare(b.label)
  );
  const descriptionValues = ordered.map((item) => item.descriptionTokens === undefined ? "hidden" : String(item.descriptionTokens));
  const bodyValues = ordered.map((item) => String(item.bodyTokens));
  const descriptionTotal = String(metrics.reduce((sum, item) => sum + (item.descriptionTokens ?? 0), 0));
  const bodyTotal = String(metrics.reduce((sum, item) => sum + item.bodyTokens, 0));
  const descriptionWidth = Math.max("Description".length, visibleWidth(descriptionTotal), ...descriptionValues.map(visibleWidth));
  const bodyWidth = Math.max("Body".length, visibleWidth(bodyTotal), ...bodyValues.map(visibleWidth));
  const items = [
    ...(metrics.length > 2 ? formatTwoMetricRow(
      theme.fg("dim", "Total"),
      theme.fg("dim", descriptionTotal),
      theme.fg("dim", bodyTotal),
      descriptionWidth,
      bodyWidth,
      width,
      2,
    ) : []),
    ...ordered.flatMap((item, index) => formatTwoMetricRow(
      theme.fg("dim", item.label),
      theme.fg("dim", descriptionValues[index]),
      theme.fg("dim", bodyValues[index]),
      descriptionWidth,
      bodyWidth,
      width,
      2,
    )),
  ];
  return [
    ...formatTwoMetricRow(
      theme.fg("mdHeading", "[Skills]"),
      theme.fg("dim", "Description"),
      theme.fg("dim", "Body"),
      descriptionWidth,
      bodyWidth,
      width,
    ),
    ...items,
  ];
}

export default function (pi: ExtensionAPI) {
  let mcpSnapshot: McpStatusSnapshot | undefined;
  let refreshHeader: (() => void) | undefined;

  pi.events.on(MCP_STATUS_EVENT, (data) => {
    const snapshot = data as Partial<McpStatusSnapshot>;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.servers)) return;
    mcpSnapshot = snapshot as McpStatusSnapshot;
    refreshHeader?.();
  });

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;

    const agentDir = getAgentDir();

    ctx.ui.setHeader((tui, theme) => {
      let snapshot: MetricsSnapshot | undefined;
      let disposed = false;
      const refresh = () => {
        if (disposed) return;
        if (snapshot) {
          const systemPrompt = estimatedTokens(ctx.getSystemPrompt());
          snapshot = {
            ...snapshot,
            systemPrompt,
            systemPromptWarning: ctx.model !== undefined
              && systemPrompt >= ctx.model.contextWindow * SYSTEM_PROMPT_CONTEXT_RATIO,
            tools: toolMetrics(pi),
          };
        }
        tui.requestRender();
      };
      refreshHeader = refresh;
      const timer = setTimeout(() => {
        if (disposed) return;
        const systemPrompt = estimatedTokens(ctx.getSystemPrompt());
        snapshot = {
          systemPrompt,
          systemPromptWarning: ctx.model !== undefined
            && systemPrompt >= ctx.model.contextWindow * SYSTEM_PROMPT_CONTEXT_RATIO,
          context: loadProjectContextFiles({ cwd: ctx.cwd, agentDir }).map((file) => {
            const value = estimatedTokens(file.content);
            return { label: displayPath(file.path), value, warning: value >= LARGE_CONTEXT_TOKENS };
          }),
          skills: skillMetrics(pi),
          prompts: promptMetrics(pi),
          tools: toolMetrics(pi),
          extensions: [...localExtensionLabels(agentDir, ctx.cwd), ...packageExtensionLabels(agentDir)],
        };
        tui.requestRender();
      }, 0);

      return {
        render(width: number): string[] {
          const modelScope = ctx.scopedModels.length > 0
            ? theme.fg("dim", `Model scope: ${ctx.scopedModels.map(({ model, thinkingLevel }) => `${model.id}${thinkingLevel ? `:${thinkingLevel}` : ""}`).join(", ")} (${keyText("app.model.cycleForward")} to cycle)`)
            : undefined;
          const welcome = [
            ...(modelScope ? [...wrapTextWithAnsi(modelScope, width), ""] : []),
            ...baseWelcome(ctx.ui.getToolsExpanded(), width, theme),
          ];
          if (!snapshot) return [...welcome, "", theme.fg("dim", "Measuring loaded resources…"), ""];

          const systemPromptSection = (sectionWidth: number) => [
            ...formatMetricRow(
              theme.fg("mdHeading", "[System prompt]"),
              theme.fg("dim", "Tokens"),
              sectionWidth,
            ),
            ...formatMetricRow(
              theme.fg("dim", "Total"),
              theme.fg("dim", `${snapshot.systemPromptWarning ? "⚠ " : ""}${snapshot.systemPrompt}`),
              sectionWidth,
              2,
            ),
          ];
          const resourceSections = (sectionWidth: number) => [
            formatSection("Context", snapshot.context, String, sectionWidth, theme, LARGE_CONTEXT_TOKENS),
            formatSkillSection(snapshot.skills, sectionWidth, theme),
            formatSection("Prompts", snapshot.prompts, String, sectionWidth, theme),
            formatSection("Tools", snapshot.tools, String, sectionWidth, theme, LARGE_TOOL_TOKENS),
            formatMcpSection(mcpSnapshot, sectionWidth, theme),
            formatListSection("Extensions", snapshot.extensions, sectionWidth, theme),
          ];

          if (width < MIN_COLUMN_WIDTH * 2 + COLUMN_GAP) {
            const sections = resourceSections(width).filter((section) => section.length > 0);
            return [
              ...welcome,
              "",
              ...systemPromptSection(width),
              "",
              ...sections.flatMap((section, index) => index === sections.length - 1 ? section : [...section, ""]),
              "",
            ];
          }

          const columnWidth = Math.floor((width - COLUMN_GAP) / 2);
          const resources = resourceSections(columnWidth);
          const columns = renderColumns([
            { lines: systemPromptSection(columnWidth), column: 0 },
            ...resources.slice(0, -1).map((lines) => ({ lines })),
            { lines: resources.at(-1) ?? [], column: 1 },
          ], columnWidth, COLUMN_GAP);

          return [...welcome, "", ...columns, ""];
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
