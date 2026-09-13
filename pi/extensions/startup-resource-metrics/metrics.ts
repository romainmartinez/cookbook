import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, sep } from "node:path";
import {
  CONFIG_DIR_NAME,
  parseFrontmatter,
  stripFrontmatter,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

export type Metric = { label: string; value: number; warning?: boolean };
export type SkillMetric = { label: string; descriptionTokens: number | undefined; bodyTokens: number };
export type ContextFile = { path: string; content: string };
export type McpStatusSnapshot = {
  version: 1;
  servers: ReadonlyArray<{
    name: string;
    status: "connected" | "cached" | "failed" | "needs-auth" | "not-connected" | "disabled";
    toolCount: number;
    directToolCount: number;
  }>;
  totalTools: number;
};
export type MetricsSnapshot = {
  systemPrompt: number;
  systemPromptWarning: boolean;
  context: Metric[];
  skills: SkillMetric[];
  prompts: Metric[];
  tools: Metric[];
  extensions: string[];
};

type PackageSetting = string | { source: string; extensions?: string[] };

export const LARGE_CONTEXT_TOKENS = 8_000;
export const LARGE_TOOL_TOKENS = 4_000;
const SYSTEM_PROMPT_CONTEXT_RATIO = 0.1;

export function estimatedTokens(text: string): number {
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

function localExtensionLabels(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    const isExtensionFile = [".ts", ".js", ".mjs", ".cjs"].includes(extname(entry.name));
    if (entry.isFile() || (entry.isSymbolicLink() && isExtensionFile)) {
      return isExtensionFile ? [entry.name] : [];
    }
    const hasIndex = ["index.ts", "index.js", "index.mjs", "index.cjs"]
      .some((name) => existsSync(join(path, name)));
    return hasIndex ? [entry.name] : [];
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

function extensionLabels(agentDir: string, cwd: string): string[] {
  const local = [
    ...localExtensionLabels(join(agentDir, "extensions")),
    ...localExtensionLabels(join(cwd, CONFIG_DIR_NAME, "extensions")),
  ];

  try {
    const settings = JSON.parse(readFileSync(join(agentDir, "settings.json"), "utf8")) as {
      packages?: PackageSetting[];
    };
    const packages = (settings.packages ?? [])
      .map((setting) => packageExtensionLabel(agentDir, setting))
      .filter((label): label is string => label !== undefined);
    return [...local, ...packages];
  } catch {
    return local;
  }
}

function contextMetrics(files: readonly ContextFile[]): Metric[] {
  return files.map((file) => {
    const value = estimatedTokens(file.content);
    return { label: displayPath(file.path), value, warning: value >= LARGE_CONTEXT_TOKENS };
  });
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
  const seen = new Set<string>();
  return pi.getCommands().filter((command) => command.source === "skill").flatMap((command) => {
    const path = command.sourceInfo.path;
    if (seen.has(path)) return [];
    seen.add(path);

    const { frontmatter, body } = parseFrontmatter<{ "disable-model-invocation"?: boolean }>(safeRead(path));
    return [{
      label: command.name.replace(/^skill:/, ""),
      descriptionTokens: frontmatter["disable-model-invocation"] === true
        ? undefined
        : estimatedTokens(command.description ?? ""),
      bodyTokens: estimatedTokens(body.trim()),
    }];
  });
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

export function collectMetrics(options: {
  pi: ExtensionAPI;
  agentDir: string;
  cwd: string;
  systemPrompt: string;
  contextFiles: readonly ContextFile[];
  contextWindow?: number;
}): MetricsSnapshot {
  const systemPrompt = estimatedTokens(options.systemPrompt);
  return {
    systemPrompt,
    systemPromptWarning: options.contextWindow !== undefined
      && systemPrompt >= options.contextWindow * SYSTEM_PROMPT_CONTEXT_RATIO,
    context: contextMetrics(options.contextFiles),
    skills: skillMetrics(options.pi),
    prompts: promptMetrics(options.pi),
    tools: toolMetrics(options.pi),
    extensions: extensionLabels(options.agentDir, options.cwd),
  };
}
