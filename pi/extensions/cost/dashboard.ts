import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";
import {
  aggregate,
  calendarKey,
  naturalCompare,
  type CalendarDimension,
  type Dimension,
  type GroupNode,
  type IdentityDimension,
  type Snapshot,
  type UsageRecord,
} from "./data.ts";

export type DashboardState = {
  groups: Dimension[];
  from: Date;
  to: Date;
  selected: Record<IdentityDimension, Set<string>>;
  horizonKeys: string[];
};

type SortMode = "default" | "label" | "tokens" | "sessions" | "operations";
type Mode = "main" | "groups" | "filters" | "time" | "diagnostics";
const IDENTITIES: IdentityDimension[] = ["project", "provider", "model", "session"];
const DIMENSIONS: Dimension[] = [...IDENTITIES, "day", "week", "month"];
const SORTS: SortMode[] = ["default", "label", "tokens", "sessions", "operations"];
const COMPACT_HEADERS = ["Label", "Total USD", "Share", "Tokens", "Sessions", "Operations"];
const COMPACT_WIDTHS = [44, 11, 8, 13, 10, 11];
const DETAILED_HEADERS = ["Label", "Total USD", "Share", "Input USD", "Output USD", "Read USD", "Write USD", "Tokens", "Input", "Output", "Cache read", "Cache write", "Sessions", "Operations"];
const DETAILED_WIDTHS = [44, 11, 8, 11, 11, 11, 11, 13, 11, 11, 12, 12, 10, 11];

function localDate(text: string, end = false): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : undefined;
}
function dateText(date: Date): string { return calendarKey(date, "day"); }
function dollars(value: number): string { return `$${value.toFixed(2)}`; }
function number(value: number): string { return Math.round(value).toLocaleString(); }
function cell(value: string, width: number, right = false): string {
  const clipped = truncateToWidth(value, width, "");
  return right ? clipped.padStart(width) : clipped.padEnd(width);
}
function row(values: string[], widths: number[]): string {
  return values.map((value, index) => cell(value, widths[index]!, index > 0)).join(" ");
}
function recordsFor(snapshot: Snapshot, state: DashboardState): UsageRecord[] {
  return snapshot.records.filter((record) => record.timestamp >= state.from && record.timestamp <= state.to
    && IDENTITIES.every((dimension) => !state.selected[dimension].size || state.selected[dimension].has(record[dimension])));
}
function compareNodes(a: GroupNode, b: GroupNode, mode: SortMode): number {
  const calendar = a.dimension === "day" || a.dimension === "week" || a.dimension === "month";
  if (mode === "default") return calendar ? naturalCompare(b.label, a.label)
    : b.metrics.total - a.metrics.total || naturalCompare(a.label, b.label);
  if (mode === "label") return calendar ? naturalCompare(b.label, a.label) : naturalCompare(a.label, b.label);
  const av = mode === "tokens" ? a.metrics.totalTokens : mode === "sessions" ? a.metrics.sessions.size : a.metrics.operations;
  const bv = mode === "tokens" ? b.metrics.totalTokens : mode === "sessions" ? b.metrics.sessions.size : b.metrics.operations;
  return bv - av || naturalCompare(a.label, b.label);
}
export function sortTree(node: GroupNode, mode: SortMode): void {
  node.children.sort((a, b) => compareNodes(a, b, mode));
  node.children.forEach((child) => sortTree(child, mode));
}

type FlatNode = { node: GroupNode; depth: number };
export class CostDashboard {
  private mode: Mode = "main";
  private sort: SortMode = "default";
  private selectedRow = 0;
  private vertical = 0;
  private horizontal = 0;
  private detailed = false;
  private expanded = new Set<string>();
  private knownNodes = new Set<string>();
  private groupCursor = 0;
  private filterDimension = 0;
  private filterCursor = 0;
  private query = "";
  private timeCursor = 0;
  private customField: "from" | "to" = "from";
  private customFrom: string;
  private customTo: string;
  private snapshot: Snapshot;
  private state: DashboardState;
  private theme: Theme;
  private close: () => void;
  constructor(snapshot: Snapshot, state: DashboardState, theme: Theme, close: () => void) {
    this.snapshot = snapshot; this.state = state; this.theme = theme; this.close = close;
    this.customFrom = dateText(state.from); this.customTo = dateText(state.to);
    this.tree();
  }
  private tree(): GroupNode {
    const first = this.state.groups[0];
    const keys = first === "day" || first === "week" || first === "month" ? periodKeys(this.state.from, this.state.to, first) : [];
    const tree = aggregate(recordsFor(this.snapshot, this.state), this.state.groups, keys);
    sortTree(tree, this.sort);
    const visit = (node: GroupNode) => {
      if (!this.knownNodes.has(node.key)) { this.knownNodes.add(node.key); this.expanded.add(node.key); }
      node.children.forEach(visit);
    };
    visit(tree);
    return tree;
  }
  private flat(): FlatNode[] {
    const output: FlatNode[] = [];
    const walk = (node: GroupNode, depth: number) => {
      output.push({ node, depth });
      if (this.expanded.has(node.key)) node.children.forEach((child) => walk(child, depth + 1));
    };
    walk(this.tree(), 0);
    return output;
  }
  private changed(): void { this.selectedRow = 0; this.vertical = 0; }
  handleInput(data: string): void {
    if (matchesKey(data, Key.escape)) {
      if (this.mode === "main") this.close(); else this.mode = "main";
      return;
    }
    if (this.mode === "main") this.mainInput(data);
    else if (this.mode === "groups") this.groupInput(data);
    else if (this.mode === "filters") this.filterInput(data);
    else if (this.mode === "time") this.timeInput(data);
    else if (this.mode === "diagnostics") this.diagnosticInput(data);
  }
  private mainInput(data: string): void {
    const flat = this.flat();
    if (matchesKey(data, Key.up)) this.selectedRow = Math.max(0, this.selectedRow - 1);
    else if (matchesKey(data, Key.down)) this.selectedRow = Math.min(flat.length - 1, this.selectedRow + 1);
    else if (matchesKey(data, Key.left)) this.horizontal = Math.max(0, this.horizontal - 8);
    else if (matchesKey(data, Key.right)) this.horizontal += 8;
    else if (matchesKey(data, Key.enter) || matchesKey(data, Key.space)) {
      const node = flat[this.selectedRow]?.node;
      if (node?.children.length) this.expanded.has(node.key) ? this.expanded.delete(node.key) : this.expanded.add(node.key);
    } else if (data === "s") { this.sort = SORTS[(SORTS.indexOf(this.sort) + 1) % SORTS.length]!; this.changed(); }
    else if (data === "g") this.mode = "groups";
    else if (data === "f") this.mode = "filters";
    else if (data === "t") this.mode = "time";
    else if (data === "d") { this.detailed = !this.detailed; this.horizontal = 0; }
    else if (data === "e" && this.snapshot.diagnostics.length) this.mode = "diagnostics";
  }
  private groupItems(): Dimension[] {
    return [...this.state.groups, ...DIMENSIONS.filter((dimension) => !this.state.groups.includes(dimension))];
  }
  private groupInput(data: string): void {
    const items = this.groupItems();
    if (matchesKey(data, Key.enter)) this.mode = "main";
    else if (matchesKey(data, Key.up)) this.groupCursor = Math.max(0, this.groupCursor - 1);
    else if (matchesKey(data, Key.down)) this.groupCursor = Math.min(items.length - 1, this.groupCursor + 1);
    else if (matchesKey(data, Key.space)) {
      const dimension = items[this.groupCursor]!;
      const index = this.state.groups.indexOf(dimension);
      if (index >= 0) this.state.groups.splice(index, 1);
      else {
        if ((dimension === "day" || dimension === "week" || dimension === "month")
          && this.state.groups.some((item) => item === "day" || item === "week" || item === "month")) return;
        this.state.groups.push(dimension);
      }
      this.groupCursor = Math.min(this.groupCursor, this.groupItems().length - 1);
      this.changed();
    } else if (matchesKey(data, Key.ctrl("up")) || matchesKey(data, Key.ctrl("down"))) {
      const dimension = items[this.groupCursor]!;
      const index = this.state.groups.indexOf(dimension);
      const next = matchesKey(data, Key.ctrl("up")) ? index - 1 : index + 1;
      if (index >= 0 && next >= 0 && next < this.state.groups.length) {
        [this.state.groups[index], this.state.groups[next]] = [this.state.groups[next]!, this.state.groups[index]!];
        this.groupCursor = next;
      }
      this.changed();
    }
  }
  private filteredValues(): string[] {
    const values = this.snapshot.values[IDENTITIES[this.filterDimension]!];
    const query = this.query.toLocaleLowerCase();
    return query ? values.filter((value) => value.toLocaleLowerCase().includes(query)) : values;
  }
  private filterInput(data: string): void {
    const dimension = IDENTITIES[this.filterDimension]!;
    const values = this.filteredValues();
    if (matchesKey(data, Key.enter)) this.mode = "main";
    else if (matchesKey(data, Key.tab)) { this.filterDimension = (this.filterDimension + 1) % IDENTITIES.length; this.filterCursor = 0; this.query = ""; }
    else if (matchesKey(data, Key.up)) this.filterCursor = Math.max(0, this.filterCursor - 1);
    else if (matchesKey(data, Key.down)) this.filterCursor = Math.min(Math.max(0, values.length - 1), this.filterCursor + 1);
    else if (matchesKey(data, Key.space) && values[this.filterCursor]) {
      const value = values[this.filterCursor]!;
      this.state.selected[dimension].delete("\0no-match");
      this.state.selected[dimension].has(value) ? this.state.selected[dimension].delete(value) : this.state.selected[dimension].add(value);
      this.changed();
    } else if (matchesKey(data, Key.ctrl("l"))) { this.state.selected[dimension].clear(); this.changed(); }
    else if (matchesKey(data, Key.backspace)) { this.query = this.query.slice(0, -1); this.filterCursor = 0; }
    else if (data.length === 1 && data >= " ") { this.query += data; this.filterCursor = 0; }
  }
  private applyPreset(kind: "daily" | "weekly" | "monthly" | "30d"): void {
    const now = new Date();
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let from: Date;
    if (kind === "daily" || kind === "30d") { from = new Date(to); from.setDate(from.getDate() - (kind === "daily" ? 6 : 29)); from.setHours(0, 0, 0, 0); }
    else if (kind === "weekly") { from = new Date(to); from.setDate(from.getDate() - (from.getDay() || 7) + 1 - 11 * 7); from.setHours(0, 0, 0, 0); }
    else { from = new Date(to.getFullYear(), to.getMonth() - 11, 1); }
    this.state.from = from; this.state.to = to;
    const dimension: CalendarDimension = kind === "weekly" ? "week" : kind === "monthly" ? "month" : "day";
    if (kind !== "30d") {
      this.state.groups = [dimension, ...this.state.groups.filter((group) => group !== "day" && group !== "week" && group !== "month")];
    }
    this.state.horizonKeys = periodKeys(from, to, dimension); this.customFrom = dateText(from); this.customTo = dateText(to); this.changed();
  }
  private timeInput(data: string): void {
    const presets = ["daily", "weekly", "monthly", "30d", "custom"] as const;
    if (matchesKey(data, Key.up)) this.timeCursor = Math.max(0, this.timeCursor - 1);
    else if (matchesKey(data, Key.down)) this.timeCursor = Math.min(presets.length - 1, this.timeCursor + 1);
    else if (matchesKey(data, Key.enter) && this.timeCursor < 4) {
      this.applyPreset(presets[this.timeCursor] as "daily" | "weekly" | "monthly" | "30d");
      this.mode = "main";
    }
    else if (this.timeCursor === 4) {
      if (matchesKey(data, Key.tab)) this.customField = this.customField === "from" ? "to" : "from";
      else if (matchesKey(data, Key.backspace)) this.customField === "from" ? this.customFrom = this.customFrom.slice(0, -1) : this.customTo = this.customTo.slice(0, -1);
      else if (matchesKey(data, Key.enter)) {
        const from = localDate(this.customFrom), to = localDate(this.customTo, true);
        if (from && to && from <= to) {
          this.state.from = from;
          this.state.to = to;
          const calendar = this.state.groups.find((group) => group === "day" || group === "week" || group === "month") as CalendarDimension | undefined;
          this.state.horizonKeys = calendar ? periodKeys(from, to, calendar) : [];
          this.changed();
          this.mode = "main";
        }
      } else if (/^[0-9-]$/.test(data)) this.customField === "from" ? this.customFrom += data : this.customTo += data;
    }
  }
  private diagnosticInput(data: string): void {
    if (matchesKey(data, Key.up)) this.vertical = Math.max(0, this.vertical - 1);
    else if (matchesKey(data, Key.down)) this.vertical = Math.min(Math.max(0, this.snapshot.diagnostics.length - 1), this.vertical + 1);
  }
  render(width: number): string[] {
    if (this.mode === "groups") return this.renderGroups(width);
    if (this.mode === "filters") return this.renderFilters(width);
    if (this.mode === "time") return this.renderTime(width);
    if (this.mode === "diagnostics") return this.renderDiagnostics(width);
    const flat = this.flat();
    if (this.selectedRow < this.vertical) this.vertical = this.selectedRow;
    const height = 22;
    if (this.selectedRow >= this.vertical + height) this.vertical = this.selectedRow - height + 1;
    const total = flat[0]?.node.metrics.total ?? 0;
    const headers = this.detailed ? DETAILED_HEADERS : COMPACT_HEADERS;
    const widths = this.detailed ? DETAILED_WIDTHS : COMPACT_WIDTHS;
    const body = flat.map(({ node, depth }) => {
      const marker = node.children.length ? (this.expanded.has(node.key) ? "▼" : "▶") : " ";
      const metrics = node.metrics;
      const common = [`${"  ".repeat(depth)}${marker} ${node.label}`, dollars(metrics.total), total ? `${(metrics.total / total * 100).toFixed(1)}%` : "0.0%"];
      const values = this.detailed
        ? [...common, dollars(metrics.input), dollars(metrics.output), dollars(metrics.cacheRead), dollars(metrics.cacheWrite), number(metrics.totalTokens),
          number(metrics.inputTokens), number(metrics.outputTokens), number(metrics.cacheReadTokens), number(metrics.cacheWriteTokens),
          number(metrics.sessions.size), number(metrics.operations)]
        : [...common, number(metrics.totalTokens), number(metrics.sessions.size), number(metrics.operations)];
      return row(values, widths);
    });
    const header = row(headers, widths);
    this.horizontal = Math.min(this.horizontal, Math.max(0, header.length - Math.max(1, width)));
    const visible = [header, ...body.slice(this.vertical, this.vertical + height)].map((line, index) => {
      const content = truncateToWidth(line.slice(this.horizontal), Math.max(1, width), "");
      const actual = index === 0 ? -1 : this.vertical + index - 1;
      return actual === this.selectedRow ? this.theme.bg("selectedBg", content.padEnd(width)) : content;
    });
    const lines = [truncateToWidth(this.theme.bold(this.theme.fg("accent", "Cost dashboard")), width),
      truncateToWidth(`Groups: ${this.state.groups.join(" › ") || "none"}  Range: ${dateText(this.state.from)}..${dateText(this.state.to)}  Sort: ${this.sort}  Columns: ${this.detailed ? "detailed" : "compact"}`, width)];
    if (this.snapshot.diagnostics.length) lines.push(truncateToWidth(this.theme.fg("warning", `⚠ ${this.snapshot.diagnostics.length} bad-data diagnostic(s), press e`), width));
    lines.push(...visible, truncateToWidth("↑↓ rows  ←→ horizontal  enter expand  s sort  g groups  f filters  t time  d details  e errors  esc close", width));
    return lines;
  }
  private renderGroups(width: number): string[] {
    const items = this.groupItems();
    return [this.theme.bold("Grouping editor"), `Order: ${this.state.groups.join(" › ") || "none"}`,
      ...items.map((dimension, index) => truncateToWidth(`${index === this.groupCursor ? ">" : " "} ${this.state.groups.includes(dimension) ? `[${this.state.groups.indexOf(dimension) + 1}]` : "[ ]"} ${dimension}`, width)),
      "space add/remove  ctrl+up/down reorder  enter apply  esc back"];
  }
  private renderFilters(width: number): string[] {
    const dimension = IDENTITIES[this.filterDimension]!, values = this.filteredValues();
    return [this.theme.bold("Identity filters"), `Dimension: ${dimension}  Search: ${this.query || "(type to search)"}`,
      ...values.slice(Math.max(0, this.filterCursor - 8), this.filterCursor + 9).map((value) => truncateToWidth(`${value === values[this.filterCursor] ? ">" : " "} ${this.state.selected[dimension].has(value) ? "[x]" : "[ ]"} ${value}`, width)),
      "tab dimension  type search  space toggle  ctrl+l clear  enter apply  esc back"];
  }
  private renderTime(width: number): string[] {
    const options = ["daily: 7 dates", "weekly: 12 weeks", "monthly: 12 months", "30d: 30 dates", "custom"];
    return [this.theme.bold("Time filter"), ...options.map((option, index) => `${index === this.timeCursor ? ">" : " "} ${option}`),
      ...(this.timeCursor === 4 ? [`${this.customField === "from" ? ">" : " "} from ${this.customFrom}`, `${this.customField === "to" ? ">" : " "} to   ${this.customTo}`, "tab field, enter apply"] : []),
      truncateToWidth("↑↓ choose  enter apply  esc back", width)];
  }
  private renderDiagnostics(width: number): string[] {
    return [this.theme.bold(`Bad-data diagnostics (${this.snapshot.diagnostics.length})`),
      ...this.snapshot.diagnostics.slice(this.vertical, this.vertical + 22).map((item) => truncateToWidth(`${item.file}${item.line ? `:${item.line}` : ""}: ${item.message}`, width)),
      "↑↓ scroll  esc back"];
  }
  invalidate(): void {}
}

export function periodKeys(from: Date, to: Date, dimension: CalendarDimension): string[] {
  const keys: string[] = [], seen = new Set<string>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cursor <= to) {
    const key = calendarKey(cursor, dimension);
    if (!seen.has(key)) { seen.add(key); keys.push(key); }
    if (dimension === "month") cursor.setMonth(cursor.getMonth() + 1, 1); else cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
