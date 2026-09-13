import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import {
  DIMENSIONS,
  aggregate,
  filterRecords,
  type CalendarDimension,
  type Dimension,
  type Filters,
  type IdentityDimension,
  loadSnapshot,
} from "./data.ts";
import { CostDashboard, periodKeys, sortTree, type DashboardState } from "./dashboard.ts";

export const HELP = `Usage: /cost [daily|weekly|monthly] [options]

Open a snapshot of costs from all persisted Pi sessions.

Options:
  --group <list>       Ordered comma-separated groups: project,provider,model,session,day,week,month
  --since <date|Nd|Nw|Nm>  Inclusive start date or rolling local-calendar horizon
  --from <YYYY-MM-DD>  Inclusive start date
  --to <YYYY-MM-DD>    Inclusive end date
  --project <text>     Repeatable case-insensitive project substring
  --provider <text>    Repeatable case-insensitive provider substring
  --model <text>       Repeatable case-insensitive provider/model substring
  --session <text>     Repeatable case-insensitive session substring
  --help               Show this help

Defaults: group day,project over 7 local dates. Presets use 7 dates, 12 Monday weeks, or 12 months.`;

type ParsedArgs = {
  help: boolean;
  groups: Dimension[];
  filters: Filters;
  from: Date;
  to: Date;
  calendarKeys: string[];
};
function start(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function end(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999); }
function parseDate(value: string, endOfDay = false): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : undefined;
}
function tokens(input: string): string[] {
  const output: string[] = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'([^']*)'|(\S+)/g;
  for (const match of input.matchAll(pattern)) output.push((match[1] ?? match[2] ?? match[3]!).replace(/\\"/g, '"'));
  return output;
}
function horizon(to: Date, dimension: CalendarDimension | undefined, count?: number): Date {
  const from = start(to);
  if (dimension === "week") {
    from.setDate(from.getDate() - (from.getDay() || 7) + 1 - ((count ?? 12) - 1) * 7);
  } else if (dimension === "month") {
    from.setDate(1); from.setMonth(from.getMonth() - ((count ?? 12) - 1));
  } else from.setDate(from.getDate() - ((count ?? (dimension === "day" ? 7 : 30)) - 1));
  return from;
}
export function parseArgs(input: string, now = new Date()): ParsedArgs {
  const args = tokens(input);
  let preset: "daily" | "weekly" | "monthly" | undefined;
  if (["daily", "weekly", "monthly"].includes(args[0] ?? "")) preset = args.shift() as typeof preset;
  const repeated: Partial<Record<IdentityDimension, string[]>> = {};
  let groupsText: string | undefined, since: string | undefined, fromText: string | undefined, toText: string | undefined;
  let help = false;
  const take = (index: number, inline: string | undefined, flag: string): [string, number] => {
    const value = inline ?? args[index + 1];
    if (!value || (!inline && value.startsWith("--"))) throw new Error(`${flag} requires a value`);
    return [value, inline === undefined ? index + 1 : index];
  };
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--help" || argument === "-h") { help = true; continue; }
    if (!argument.startsWith("--")) throw new Error(`unexpected argument: ${argument}`);
    const equals = argument.indexOf("=");
    const flag = equals < 0 ? argument : argument.slice(0, equals);
    const inline = equals < 0 ? undefined : argument.slice(equals + 1);
    const [value, next] = take(index, inline, flag); index = next;
    if (flag === "--group") groupsText = value;
    else if (flag === "--since") since = value;
    else if (flag === "--from") fromText = value;
    else if (flag === "--to") toText = value;
    else if (["--project", "--provider", "--model", "--session"].includes(flag)) {
      const dimension = flag.slice(2) as IdentityDimension;
      (repeated[dimension] ??= []).push(value);
    } else throw new Error(`unknown option: ${flag}`);
  }
  if (since && fromText) throw new Error("--since and --from cannot be combined");
  let groups: Dimension[];
  if (groupsText !== undefined) {
    groups = groupsText.split(",").map((item) => item.trim()).filter(Boolean) as Dimension[];
    if (!groups.length) throw new Error("--group cannot be empty");
    const invalid = groups.find((item) => !DIMENSIONS.includes(item));
    if (invalid) throw new Error(`unknown group: ${invalid}`);
    if (new Set(groups).size !== groups.length) throw new Error("group dimensions must be unique");
    if (groups.filter((item) => item === "day" || item === "week" || item === "month").length > 1) throw new Error("use at most one calendar group");
  } else {
    const calendar: CalendarDimension = preset === "weekly" ? "week" : preset === "monthly" ? "month" : "day";
    groups = [calendar, "project"];
  }
  const calendar = groups.find((item) => item === "day" || item === "week" || item === "month") as CalendarDimension | undefined;
  const presetCalendar: CalendarDimension | undefined = preset === "weekly" ? "week" : preset === "monthly" ? "month" : preset === "daily" ? "day" : undefined;
  let to = toText ? parseDate(toText, true) : end(now);
  if (!to) throw new Error(`invalid --to date: ${toText}`);
  let from: Date | undefined;
  if (fromText) {
    from = parseDate(fromText);
    if (!from) throw new Error(`invalid --from date: ${fromText}`);
  } else if (since) {
    from = parseDate(since);
    if (!from) {
      const match = /^(\d+)([dwm])$/.exec(since);
      if (!match || Number(match[1]) < 1) throw new Error(`invalid --since value: ${since}`);
      const dimension = match[2] === "w" ? "week" : match[2] === "m" ? "month" : "day";
      from = horizon(to, dimension, Number(match[1]));
    }
  }
  if (!from) from = horizon(to, presetCalendar ?? calendar);
  if (from > to) throw new Error("--from/--since must not be after --to");
  const filters: Filters = { ...repeated, from, to };
  return { help, groups, filters, from, to, calendarKeys: calendar ? periodKeys(from, to, calendar) : [] };
}

export function report(parsed: ParsedArgs, snapshot: Awaited<ReturnType<typeof loadSnapshot>>): string {
  const root = aggregate(filterRecords(snapshot.records, parsed.filters), parsed.groups, parsed.calendarKeys);
  sortTree(root, "default");
  const m = root.metrics;
  const rows: Array<{ depth: number; node: (typeof root) }> = [];
  const visit = (node: typeof root, depth: number) => {
    for (const child of node.children) {
      rows.push({ depth, node: child });
      visit(child, depth + 1);
    }
  };
  visit(root, 0);
  const maximumRows = 500;
  const body = rows.slice(0, maximumRows).map(({ depth, node }) => {
    const metrics = node.metrics;
    const share = m.total ? metrics.total / m.total * 100 : 0;
    return [
      `${"  ".repeat(depth)}${node.label}`,
      `$${metrics.total.toFixed(2)}`,
      `${share.toFixed(1)}%`,
      `cost[in=$${metrics.input.toFixed(2)} out=$${metrics.output.toFixed(2)} read=$${metrics.cacheRead.toFixed(2)} write=$${metrics.cacheWrite.toFixed(2)}]`,
      `tokens[total=${Math.round(metrics.totalTokens).toLocaleString()} in=${Math.round(metrics.inputTokens).toLocaleString()} out=${Math.round(metrics.outputTokens).toLocaleString()} read=${Math.round(metrics.cacheReadTokens).toLocaleString()} write=${Math.round(metrics.cacheWriteTokens).toLocaleString()}]`,
      `sessions=${metrics.sessions.size}`,
      `operations=${metrics.operations}`,
    ].join("  ");
  });
  if (rows.length > maximumRows) body.push(`... ${rows.length - maximumRows} more grouped rows omitted`);
  return [
    `Total: $${m.total.toFixed(2)}  Sessions: ${m.sessions.size}  Operations: ${m.operations}  Files: ${snapshot.files}`,
    `Costs: input $${m.input.toFixed(2)}  output $${m.output.toFixed(2)}  cache read $${m.cacheRead.toFixed(2)}  cache write $${m.cacheWrite.toFixed(2)}`,
    `Tokens: total ${Math.round(m.totalTokens).toLocaleString()}  input ${Math.round(m.inputTokens).toLocaleString()}  output ${Math.round(m.outputTokens).toLocaleString()}  cache read ${Math.round(m.cacheReadTokens).toLocaleString()}  cache write ${Math.round(m.cacheWriteTokens).toLocaleString()}`,
    snapshot.diagnostics.length ? `Warning: ${snapshot.diagnostics.length} bad-data diagnostic(s)` : "Diagnostics: none",
    ...(body.length ? ["", `Groups: ${parsed.groups.join(" > ") || "none"}`, ...body] : []),
  ].join("\n");
}

const UNSUPPORTED = "cost: the interactive dashboard is unsupported in print/json mode; use TUI or RPC mode.";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("cost", {
    description: "Explore costs across all persisted Pi sessions",
    handler: async (args, ctx) => {
      let parsed: ParsedArgs;
      try { parsed = parseArgs(args); } catch (error) {
        const message = `cost: ${error instanceof Error ? error.message : String(error)}\nUse /cost --help for usage.`;
        if (ctx.mode === "tui" || ctx.mode === "rpc") ctx.ui.notify(message, "error");
        else process.stderr.write(`${UNSUPPORTED}\n${message}\n`);
        return;
      }
      if (parsed.help) {
        if (ctx.mode === "tui" || ctx.mode === "rpc") ctx.ui.notify(HELP, "info");
        else process.stderr.write(`${UNSUPPORTED}\n\n${HELP}\n`);
        return;
      }
      if (ctx.mode !== "tui" && ctx.mode !== "rpc") { process.stderr.write(`${UNSUPPORTED}\n`); return; }
      const snapshot = await loadSnapshot(join(getAgentDir(), "sessions"));
      if (ctx.mode === "rpc") { ctx.ui.notify(report(parsed, snapshot), snapshot.diagnostics.length ? "warning" : "info"); return; }
      const selected = Object.fromEntries((["project", "provider", "model", "session"] as IdentityDimension[]).map((dimension) => {
        const terms = parsed.filters[dimension] ?? [];
        const matches = snapshot.values[dimension].filter((value) => terms.some((term) => value.toLocaleLowerCase().includes(term.toLocaleLowerCase())));
        return [dimension, new Set(terms.length && !matches.length ? ["\0no-match"] : matches)];
      })) as DashboardState["selected"];
      const state: DashboardState = { groups: [...parsed.groups], from: parsed.from, to: parsed.to, selected, horizonKeys: parsed.calendarKeys };
      await ctx.ui.custom<void>((tui, theme, _keybindings, done) => {
        const dashboard = new CostDashboard(snapshot, state, theme, () => done());
        return { render: (width) => dashboard.render(width), invalidate: () => dashboard.invalidate(), handleInput: (data) => { dashboard.handleInput(data); tui.requestRender(); } };
      });
    },
  });
}
