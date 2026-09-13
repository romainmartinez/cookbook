import {
  VERSION,
  keyHint,
  keyText,
  rawKeyHint,
  type Theme,
} from "@earendil-works/pi-coding-agent";
import { visibleWidth, wrapTextWithAnsi, type Keybinding } from "@earendil-works/pi-tui";
import {
  LARGE_CONTEXT_TOKENS,
  LARGE_TOOL_TOKENS,
  type McpStatusSnapshot,
  type Metric,
  type MetricsSnapshot,
  type SkillMetric,
} from "./metrics.ts";

const MAX_TABLE_WIDTH = 56;
const MIN_COLUMN_WIDTH = 32;
const COLUMN_GAP = 4;

function wrapIndented(text: string, width: number): string[] {
  if (!text) return [""];
  const prefix = width > 1 ? " " : "";
  return wrapTextWithAnsi(text, Math.max(1, width - prefix.length)).map((line) => `${prefix}${line}`);
}

function welcomeLines(expanded: boolean, width: number, theme: Theme): string[] {
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
  const title = theme.bold(theme.fg("accent", "π")) + theme.fg("dim", ` v${VERSION}`);
  const onboarding = theme.fg("dim", "Pi can explain its own features and look up its docs. Ask it how to use or extend Pi.");
  const content = expanded
    ? [title, ...expandedInstructions, "", onboarding]
    : [
        title,
        compactInstructions,
        theme.fg("dim", `Press ${keyText("app.tools.expand")} to show full startup help and loaded resources.`),
        "",
        onboarding,
      ];
  return content.flatMap((line) => wrapIndented(line, width));
}

function formatMetricRow(label: string, value: string, width: number, indent = 0): string[] {
  const tableWidth = Math.min(width, MAX_TABLE_WIDTH);
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
  const tableWidth = Math.min(width, MAX_TABLE_WIDTH);
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

function formatMetricSection(
  title: string,
  metrics: Metric[],
  width: number,
  theme: Theme,
  totalWarningThreshold?: number,
): string[] {
  if (metrics.length === 0) return [];
  const ordered = [...metrics].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const total = metrics.reduce((sum, item) => sum + item.value, 0);
  const items = [
    ...(metrics.length > 2 ? formatMetricRow(
      theme.bold("Total"),
      theme.fg("dim", `${totalWarningThreshold !== undefined && total >= totalWarningThreshold ? "⚠ " : ""}${total}`),
      width,
      2,
    ) : []),
    ...ordered.flatMap((item) => formatMetricRow(
      theme.fg("dim", item.label),
      theme.fg("dim", `${item.warning ? "⚠ " : ""}${item.value}`),
      width,
      2,
    )),
  ];
  return [
    ...formatMetricRow(theme.fg("mdHeading", `[${title}]`), theme.fg("dim", "Tokens"), width),
    ...items,
  ];
}

function formatListSection(title: string, labels: string[], width: number, theme: Theme): string[] {
  if (labels.length === 0) return [];
  const items = [...new Set(labels)].sort().flatMap((label) =>
    wrapTextWithAnsi(theme.fg("dim", label), Math.max(1, width - 2)).map((line) => `  ${line}`),
  );
  return [
    ...wrapTextWithAnsi(theme.fg("mdHeading", `[${title}]`), Math.max(1, width)),
    ...items,
  ];
}

function formatMcpSection(snapshot: McpStatusSnapshot | undefined, width: number, theme: Theme): string[] {
  if (!snapshot || snapshot.servers.length === 0) return [];
  const ordered = [...snapshot.servers].sort((a, b) => a.name.localeCompare(b.name));
  const directTotal = snapshot.servers.reduce((sum, server) => sum + server.directToolCount, 0);
  const toolWidth = Math.max("Tools".length, String(snapshot.totalTools).length);
  const directWidth = Math.max("Direct".length, String(directTotal).length);
  const items = [
    ...(snapshot.servers.length > 2 ? formatTwoMetricRow(
      theme.bold("Total"),
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
    (b.descriptionTokens ?? -1) - (a.descriptionTokens ?? -1)
      || b.bodyTokens - a.bodyTokens
      || a.label.localeCompare(b.label)
  );
  const descriptions = ordered.map((item) => item.descriptionTokens === undefined ? "hidden" : String(item.descriptionTokens));
  const bodies = ordered.map((item) => String(item.bodyTokens));
  const descriptionTotal = String(metrics.reduce((sum, item) => sum + (item.descriptionTokens ?? 0), 0));
  const bodyTotal = String(metrics.reduce((sum, item) => sum + item.bodyTokens, 0));
  const descriptionWidth = Math.max("Description".length, visibleWidth(descriptionTotal), ...descriptions.map(visibleWidth));
  const bodyWidth = Math.max("Body".length, visibleWidth(bodyTotal), ...bodies.map(visibleWidth));
  const items = [
    ...(metrics.length > 2 ? formatTwoMetricRow(
      theme.bold("Total"),
      theme.fg("dim", descriptionTotal),
      theme.fg("dim", bodyTotal),
      descriptionWidth,
      bodyWidth,
      width,
      2,
    ) : []),
    ...ordered.flatMap((item, index) => formatTwoMetricRow(
      theme.fg("dim", item.label),
      theme.fg("dim", descriptions[index]),
      theme.fg("dim", bodies[index]),
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

function renderColumns(sections: Array<{ lines: string[]; column?: 0 | 1 }>, leftWidth: number): string[] {
  const columns: [string[], string[]] = [[], []];
  for (const section of sections) {
    if (section.lines.length === 0) continue;
    const column = section.column ?? (columns[0].length <= columns[1].length ? 0 : 1);
    if (columns[column].length > 0) columns[column].push("");
    columns[column].push(...section.lines);
  }

  const height = Math.max(columns[0].length, columns[1].length);
  const separator = " ".repeat(COLUMN_GAP);
  return Array.from({ length: height }, (_, index) => {
    const left = columns[0][index] ?? "";
    const right = columns[1][index] ?? "";
    return `${left}${" ".repeat(leftWidth - visibleWidth(left))}${separator}${right}`.trimEnd();
  });
}

export function renderHeader(options: {
  width: number;
  expanded: boolean;
  modelScope: string[];
  snapshot?: MetricsSnapshot;
  mcpSnapshot?: McpStatusSnapshot;
  theme: Theme;
}): string[] {
  const { width, expanded, modelScope, snapshot, mcpSnapshot, theme } = options;
  const scope = modelScope.length > 0
    ? theme.fg("dim", `Model scope: ${modelScope.join(", ")} (${keyText("app.model.cycleForward")} to cycle)`)
    : undefined;
  const welcome = [
    ...(scope ? [...wrapTextWithAnsi(scope, Math.max(1, width)), ""] : []),
    ...welcomeLines(expanded, width, theme),
  ];
  if (!snapshot) return [...welcome, "", ...wrapTextWithAnsi(theme.fg("dim", "Measuring loaded resources…"), Math.max(1, width)), ""];

  const systemPromptSection = (sectionWidth: number) => [
    ...formatMetricRow(theme.fg("mdHeading", "[System prompt]"), theme.fg("dim", "Tokens"), sectionWidth),
    ...formatMetricRow(
      theme.bold("Total"),
      theme.fg("dim", `${snapshot.systemPromptWarning ? "⚠ " : ""}${snapshot.systemPrompt}`),
      sectionWidth,
      2,
    ),
  ];
  const resourceSections = (sectionWidth: number) => [
    formatMetricSection("Context", snapshot.context, sectionWidth, theme, LARGE_CONTEXT_TOKENS),
    formatSkillSection(snapshot.skills, sectionWidth, theme),
    formatMetricSection("Prompts", snapshot.prompts, sectionWidth, theme),
    formatMetricSection("Tools", snapshot.tools, sectionWidth, theme, LARGE_TOOL_TOKENS),
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
  ], columnWidth);
  return [...welcome, "", ...columns, ""];
}
