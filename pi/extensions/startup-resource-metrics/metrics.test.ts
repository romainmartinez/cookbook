import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { collectMetrics, LARGE_CONTEXT_TOKENS, LARGE_TOOL_TOKENS } from "./metrics.ts";

type Command = ReturnType<ExtensionAPI["getCommands"]>[number];
type Tool = ReturnType<ExtensionAPI["getAllTools"]>[number];

function fakePi(options: {
  activeTools?: string[];
  tools?: Tool[];
  commands?: Command[];
} = {}): ExtensionAPI {
  return {
    getActiveTools: () => options.activeTools ?? [],
    getAllTools: () => options.tools ?? [],
    getCommands: () => options.commands ?? [],
  } as unknown as ExtensionAPI;
}

function command(name: string, source: "skill" | "prompt", path: string, description?: string): Command {
  return { name, source, sourceInfo: { path }, description } as Command;
}

function withTempDir(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "startup-resource-metrics-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("collects active resources and applies inclusive warning boundaries", () => {
  const toolAtTokens = (name: string, tokens: number): Tool => {
    const empty = { name, description: "", parameters: {} };
    return { ...empty, description: "x".repeat(tokens * 4 - JSON.stringify(empty).length) } as Tool;
  };
  const tools = [
    toolAtTokens("below", LARGE_TOOL_TOKENS - 1),
    toolAtTokens("boundary", LARGE_TOOL_TOKENS),
    { name: "inactive", description: "ignored", parameters: {} } as Tool,
  ];

  const snapshot = collectMetrics({
    pi: fakePi({ activeTools: ["below", "boundary"], tools }),
    agentDir: "/missing-agent-dir",
    cwd: "/missing-cwd",
    systemPrompt: "x".repeat(399),
    contextFiles: [
      { path: "/below.md", content: "x".repeat((LARGE_CONTEXT_TOKENS - 1) * 4) },
      { path: "/boundary.md", content: "x".repeat(LARGE_CONTEXT_TOKENS * 4) },
    ],
    contextWindow: 1_000,
  });

  assert.equal(snapshot.systemPrompt, 100);
  assert.equal(snapshot.systemPromptWarning, true);
  assert.deepEqual(snapshot.context, [
    { label: "/below.md", value: LARGE_CONTEXT_TOKENS - 1, warning: false },
    { label: "/boundary.md", value: LARGE_CONTEXT_TOKENS, warning: true },
  ]);
  assert.deepEqual(snapshot.tools, [
    { label: "below", value: LARGE_TOOL_TOKENS - 1, warning: false },
    { label: "boundary", value: LARGE_TOOL_TOKENS, warning: true },
  ]);
});

test("deduplicates commands and respects skill frontmatter", () => withTempDir((root) => {
  const skillPath = join(root, "skill.md");
  const hiddenSkillPath = join(root, "hidden.md");
  const promptPath = join(root, "prompt.md");
  writeFileSync(skillPath, "---\nname: demo\n---\n12345678\n");
  writeFileSync(hiddenSkillPath, "---\ndisable-model-invocation: true\n---\nhidden body\n");
  writeFileSync(promptPath, "---\ntitle: Demo\n---\nprompt body");

  const snapshot = collectMetrics({
    pi: fakePi({ commands: [
      command("skill:demo", "skill", skillPath, "12345"),
      command("skill:duplicate", "skill", skillPath, "ignored"),
      command("skill:hidden", "skill", hiddenSkillPath, "not loaded"),
      command("demo", "prompt", promptPath),
      command("duplicate", "prompt", promptPath),
    ] }),
    agentDir: join(root, "agent"),
    cwd: root,
    systemPrompt: "",
    contextFiles: [],
  });

  assert.deepEqual(snapshot.skills, [
    { label: "demo", descriptionTokens: 2, bodyTokens: 2 },
    { label: "hidden", descriptionTokens: undefined, bodyTokens: 3 },
  ]);
  assert.deepEqual(snapshot.prompts, [{ label: "/demo", value: 3 }]);
}));

test("discovers representative local and npm extensions", () => withTempDir((root) => {
  const agentDir = join(root, "agent");
  const cwd = join(root, "project");
  mkdirSync(join(agentDir, "extensions", "directory-extension"), { recursive: true });
  mkdirSync(join(cwd, ".pi", "extensions"), { recursive: true });
  writeFileSync(join(agentDir, "extensions", "single.ts"), "");
  writeFileSync(join(agentDir, "extensions", "directory-extension", "index.js"), "");
  writeFileSync(join(cwd, ".pi", "extensions", "project.mjs"), "");

  const packageRoot = join(agentDir, "npm", "node_modules", "@scope", "with-extension");
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({ pi: { extensions: ["index.ts"] } }));
  writeFileSync(join(agentDir, "settings.json"), JSON.stringify({
    packages: ["npm:@scope/with-extension@1.2.3", { source: "npm:disabled", extensions: [] }],
  }));

  const snapshot = collectMetrics({
    pi: fakePi(),
    agentDir,
    cwd,
    systemPrompt: "",
    contextFiles: [],
  });

  assert.deepEqual(snapshot.extensions.toSorted(), [
    "@scope/with-extension@1.2.3",
    "directory-extension",
    "project.mjs",
    "single.ts",
  ]);
}));

test("does not fail startup when user configuration files are malformed or missing", () => withTempDir((root) => {
  writeFileSync(join(root, "settings.json"), "not json");
  const snapshot = collectMetrics({
    pi: fakePi({ commands: [
      command("skill:missing", "skill", join(root, "missing-skill.md")),
      command("missing", "prompt", join(root, "missing-prompt.md")),
    ] }),
    agentDir: root,
    cwd: join(root, "cwd"),
    systemPrompt: "",
    contextFiles: [],
  });

  assert.deepEqual(snapshot.skills, [{ label: "missing", descriptionTokens: 0, bodyTokens: 0 }]);
  assert.deepEqual(snapshot.prompts, [{ label: "/missing", value: 0 }]);
  assert.deepEqual(snapshot.extensions, []);
}));
