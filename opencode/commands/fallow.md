---
description: run fallow codebase intelligence (dead code, dupes, complexity, boundaries, flags)
---

# Fallow: codebase intelligence for JavaScript and TypeScript

Codebase intelligence for JavaScript and TypeScript. The free static layer finds unused code, circular dependencies, code duplication, complexity hotspots, architecture boundary violations, and feature flag patterns. Runtime coverage merges production execution data into the same `fallow health` report. 90 framework plugins, zero configuration, sub-second static analysis.

## When to Use

- Finding dead code (unused files, exports, types, enum/class members)
- Finding unused or unlisted dependencies
- Detecting code duplication and clones
- Checking code health and complexity hotspots
- Cleaning up a codebase before a release or refactor
- Auditing a project for structural issues
- Setting up CI checks for dead code or duplication thresholds
- Auto-fixing unused exports and dependencies
- Detecting feature flag patterns (environment gates, SDK calls, config objects)
- Investigating why a specific export or file appears unused

## When NOT to Use

- Runtime error analysis or debugging
- Type checking (use `tsc` for that)
- Linting style or formatting issues (use ESLint, Biome, Prettier)
- Security vulnerability scanning
- Bundle size analysis
- Projects that are not JavaScript or TypeScript

## Prerequisites

Fallow must be installed. If not available, install it:

```bash
npm install -g fallow          # prebuilt binaries (fastest)
# or
npx fallow dead-code           # run without installing
# or
cargo install fallow-cli       # build from source
```

## Agent Rules

1. **Always use `--format json --quiet 2>/dev/null`** for machine-readable output. The `2>/dev/null` discards stderr so progress messages and threshold warnings don't corrupt the JSON on stdout. Never use `2>&1`
2. **Always append `|| true`** to every fallow command. Exit code 1 means "issues found" (normal), not a runtime error. Without `|| true`, the Bash tool treats exit 1 as failure and cancels parallel commands. Only exit code 2 is a real error (invalid config, parse failure)
3. **Use `--explain`** to include a `_meta` object in JSON output with metric definitions, ranges, and interpretation hints
4. **Use issue type filters** (`--unused-exports`, `--unused-files`, etc.) to limit output scope
5. **Always `--dry-run` before `fix`**, then `fix --yes` to apply
6. **All output paths are relative** to the project root
7. **Never run `fallow watch`**. It is interactive and never exits

## Commands

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `fallow` | Run all analyses: dead code + duplication + complexity (default) | `--only`, `--skip`, `--production`, `--production-dead-code`, `--production-health`, `--production-dupes`, `--ci`, `--fail-on-issues`, `--group-by`, `--summary`, `--fail-on-regression`, `--tolerance`, `--regression-baseline`, `--save-regression-baseline`, `--score`, `--trend`, `--save-snapshot` |
| `dead-code` | Dead code analysis (`check` is an alias) | `--unused-exports`, `--changed-since`, `--changed-workspaces`, `--production`, `--file`, `--include-entry-exports`, `--stale-suppressions`, `--ci`, `--group-by`, `--summary`, `--fail-on-regression`, `--tolerance`, `--regression-baseline`, `--save-regression-baseline` |
| `dupes` | Code duplication detection | `--mode`, `--threshold`, `--top`, `--changed-since`, `--workspace`, `--changed-workspaces`, `--skip-local`, `--cross-language`, `--ignore-imports`, `--fail-on-regression`, `--tolerance`, `--regression-baseline`, `--save-regression-baseline` |
| `fix` | Auto-remove unused exports/deps | `--dry-run`, `--yes` (required in non-TTY) |
| `init` | Generate config file or pre-commit hook | `--toml`, `--hooks`, `--branch` |
| `migrate` | Convert knip/jscpd config | `--dry-run`, `--from PATH` |
| `list` | Inspect project structure | `--files`, `--entry-points`, `--plugins`, `--boundaries` |
| `health` | Function complexity analysis (also covers Angular templates as synthetic `<template>` findings: external `.html` files via `templateUrl` AND inline `@Component({ template: \`...\` })` literals; suppress external with `<!-- fallow-ignore-file complexity -->` at the top of the `.html` file, suppress inline with `// fallow-ignore-next-line complexity` directly above the `@Component` decorator) | `--complexity`, `--max-cyclomatic`, `--max-cognitive`, `--max-crap`, `--top`, `--sort`, `--file-scores`, `--hotspots`, `--ownership`, `--ownership-emails`, `--targets`, `--effort`, `--score`, `--min-score`, `--since`, `--min-commits`, `--save-snapshot`, `--trend`, `--coverage-gaps`, `--coverage`, `--coverage-root`, `--runtime-coverage`, `--min-invocations-hot`, `--min-observation-volume`, `--low-traffic-threshold`, `--workspace`, `--changed-workspaces`, `--baseline`, `--save-baseline` |
| `audit` | Combined dead-code + complexity + duplication for changed files | `--base`, `--gate`, `--production`, `--production-dead-code`, `--production-health`, `--production-dupes`, `--workspace`, `--changed-workspaces`, `--ci`, `--fail-on-issues`, `--explain`, `--dead-code-baseline`, `--health-baseline`, `--dupes-baseline`, `--max-crap` |
| `flags` | Detect feature flag patterns (env vars, SDK calls, config objects) | `--top` |
| `explain` | Explain one issue type without running analysis | `<issue-type>`, `--format json` |
| `license` | Manage the local license JWT for continuous/cloud runtime monitoring (activate, status, refresh, deactivate) | `activate --trial --email <addr>`, `activate --from-file`, `activate --stdin`, `status`, `refresh`, `deactivate` |
| `coverage` | Runtime coverage setup, focused analysis, and cloud inventory workflow helper | `setup`, `setup --yes`, `setup --non-interactive`, `analyze --runtime-coverage <path>`, `analyze --cloud --repo owner/repo`, `upload-inventory` |
| `schema` | Dump CLI definition as JSON | |
| `config` | Show the loaded config path and resolved config (verifies which `.fallowrc.json` is in effect) | `--path` |

## Issue Types

| Type | Filter Flag | Description |
|------|-------------|-------------|
| Unused files | `--unused-files` | Files unreachable from entry points |
| Unused exports | `--unused-exports` | Symbols never imported elsewhere |
| Unused types | `--unused-types` | Type aliases and interfaces |
| Private type leaks | `--private-type-leaks` | Opt-in API hygiene check (default `off`) for exported signatures whose type references a same-file private type |
| Unused dependencies | `--unused-deps` | Packages in `dependencies`, `devDependencies`, `optionalDependencies`, type-only production deps, and test-only production deps. In monorepos, internal workspace package names (e.g., `@repo/ui`) declared in another workspace's `package.json` but never imported are reported here too. |
| Unused enum members | `--unused-enum-members` | Enum values never referenced |
| Unused class members | `--unused-class-members` | Methods and properties |
| Unresolved imports | `--unresolved-imports` | Imports that can't be resolved |
| Unlisted dependencies | `--unlisted-deps` | Used packages missing from package.json. In monorepos, importing a workspace package from a workspace whose own `package.json` does not list it is reported here too; self-references stay allowed without requiring a package to depend on itself. |
| Duplicate exports | `--duplicate-exports` | Same symbol exported from multiple modules |
| Circular dependencies | `--circular-deps` | Import cycles in the module graph |
| Boundary violations | `--boundary-violations` | Imports crossing architecture zone boundaries. Presets: `layered`, `hexagonal`, `feature-sliced`, `bulletproof` |
| Stale suppressions | `--stale-suppressions` | `fallow-ignore` comments or `@expected-unused` JSDoc tags that no longer match any issue |
| Test-only dependencies | n/a | Production deps only imported from test files (should be devDependencies) |

## Common Workflows

### Audit a project for all dead code

```bash
fallow dead-code --format json --quiet 2>/dev/null || true
```

Parse the JSON output. It contains arrays for each issue type (`unused_files`, `unused_exports`, `unused_types`, `unused_dependencies`, etc.) plus `total_issues` and `elapsed_ms` metadata. Each issue object includes an `actions` array with structured fix suggestions (action type, `auto_fixable` flag, description, and optional suppression comment). For dependency findings, a non-empty `used_in_workspaces` array means the package is imported elsewhere in the monorepo; treat it as a workspace placement issue and do not auto-remove it.

### Find only unused exports (smaller output)

```bash
fallow dead-code --format json --quiet --unused-exports 2>/dev/null || true
```

### Check if a PR introduces dead code

```bash
fallow dead-code --format json --quiet --changed-since main --fail-on-issues 2>/dev/null || true
```

Exit code 1 if new dead code is introduced. Only analyzes files changed since the `main` branch.

### Find code duplication

```bash
fallow dupes --format json --quiet 2>/dev/null || true
fallow dupes --format json --quiet --mode semantic 2>/dev/null || true
```

The `semantic` mode detects renamed variables. Other modes: `strict` (exact), `mild` (default, syntax normalized), `weak` (different literals).

### Safe auto-fix cycle

```bash
# 1. Preview what will be removed
fallow fix --dry-run --format json --quiet 2>/dev/null || true

# 2. Review the output, then apply
fallow fix --yes --format json --quiet 2>/dev/null || true

# 3. Verify the fix worked
fallow dead-code --format json --quiet 2>/dev/null || true
```

The `--yes` flag is required in non-TTY environments (agent subprocesses). Without it, `fix` exits with code 2.

### Discover project structure

```bash
fallow list --entry-points --format json --quiet 2>/dev/null || true
fallow list --plugins --format json --quiet 2>/dev/null || true
```

Shows detected entry points and active framework plugins (91 built-in: Next.js, Vite, Jest, Storybook, Tailwind, PandaCSS, etc.).

### Production-only analysis

```bash
fallow dead-code --format json --quiet --production 2>/dev/null || true
```

Excludes test/dev files (`*.test.*`, `*.spec.*`, `*.stories.*`) and only analyzes production scripts.

### Analyze specific workspaces

```bash
# Single package
fallow dead-code --format json --quiet --workspace my-package 2>/dev/null || true

# Multiple packages
fallow dead-code --format json --quiet --workspace web,admin 2>/dev/null || true

# Glob (matched against package name AND workspace path)
fallow dead-code --format json --quiet --workspace 'apps/*' 2>/dev/null || true

# Exclude one workspace from a set
fallow dead-code --format json --quiet --workspace 'apps/*,!apps/legacy' 2>/dev/null || true

# Monorepo CI: auto-scope to workspaces containing any file changed since origin/main
fallow dead-code --format json --quiet --changed-workspaces origin/main 2>/dev/null || true
```

Scopes output while keeping the full cross-workspace graph. Patterns are tested against BOTH the package name (from `package.json`) AND the workspace path relative to the repo root; either match counts. Use `!`-prefixed patterns to exclude.

`--changed-workspaces <REF>` auto-derives the set from `git diff`. It's the CI primitive: point it at the PR base branch (e.g. `origin/main`) and fallow reports only on workspaces touched by the change. Mutually exclusive with `--workspace`. A missing ref or non-git directory is a hard error (exit 2) rather than a silent full-scope fallback.

### Scope to specific files (lint-staged)

```bash
fallow dead-code --format json --quiet --file src/utils.ts --file src/helpers.ts 2>/dev/null || true
```

Only reports issues in the specified files. Project-wide dependency issues are suppressed. Warns on non-existent paths.

### Catch typos in entry file exports

```bash
fallow dead-code --format json --quiet --include-entry-exports 2>/dev/null || true
```

Reports unused exports in entry files (package.json `main`/`exports`, framework pages). By default, exports in entry files are assumed externally consumed. This flag catches typos like `meatdata` instead of `metadata`.

### Debug why something is flagged

```bash
# Trace an export's usage chain
fallow dead-code --format json --quiet --trace src/utils.ts:myFunction 2>/dev/null || true

# Trace all edges for a file
fallow dead-code --format json --quiet --trace-file src/utils.ts 2>/dev/null || true

# Trace where a dependency is used
fallow dead-code --format json --quiet --trace-dependency lodash 2>/dev/null || true
```

### Migrate from knip or jscpd

```bash
# Preview migration
fallow migrate --dry-run

# Apply migration (creates .fallowrc.json)
fallow migrate

# Migrate to TOML (creates fallow.toml)
fallow migrate --toml
```

Auto-detects `knip.json`, `.knip.json`, `.jscpd.json`, and package.json embedded configs.

### Initialize a new config

```bash
fallow init              # creates .fallowrc.json, adds .fallow/ to .gitignore
fallow init --toml       # creates fallow.toml, adds .fallow/ to .gitignore
fallow init --hooks      # scaffold a pre-commit git hook
fallow init --hooks --branch develop  # hook using custom base branch
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success, no error-severity issues |
| 1 | Error-severity issues found |
| 2 | Runtime error (invalid config, parse failure, or `fix` without `--yes` in non-TTY) |

When `--format json` is active and exit code is 2, errors are emitted as JSON on stdout:
```json
{"error": true, "message": "invalid config: ...", "exit_code": 2}
```

## Configuration

Fallow reads config from project root: `.fallowrc.json` > `.fallowrc.jsonc` > `fallow.toml` > `.fallow.toml`. Both `.fallowrc.json` and `.fallowrc.jsonc` accept JSON-with-comments syntax. Most projects work with zero configuration thanks to 90 auto-detecting framework plugins.

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json",
  "entry": ["src/index.ts"],
  "ignorePatterns": ["**/*.generated.ts"],
  "ignoreDependencies": ["autoprefixer"],
  "ignoreExportsUsedInFile": true,
  "publicPackages": ["@myorg/shared-lib"],
  "dynamicallyLoaded": ["plugins/**/*.ts"],
  "rules": {
    "unused-files": "error",
    "unused-exports": "warn",
    "unused-types": "off",
    "private-type-leaks": "warn"
  }
}
```

Rules: `"error"` (fail CI), `"warn"` (report only), `"off"` (skip detection).

### Inline suppression

```typescript
// fallow-ignore-next-line
export const keepThis = 1;

// fallow-ignore-next-line unused-export
export const keepThisToo = 2;

// fallow-ignore-file
// fallow-ignore-file unused-export

// Mark as intentionally unused (tracked for staleness)
/** @expected-unused */
export const deprecatedHelper = () => {};
```

## Key Gotchas

- **`fix --yes` is required** in non-TTY (agent) environments. Without it, `fix` exits with code 2
- **Zero config by default.** 90 framework plugins auto-detect. Don't create config unless customization is needed
- **Syntactic analysis only.** No TypeScript compiler, so fully dynamic `import(variable)` is not resolved
- **Function overloads are deduplicated.** TypeScript function overload signatures are merged into a single export
- **Re-export chains are resolved.** Exports through barrel files are tracked, not falsely flagged
- **`--changed-since` is additive.** Only new issues in changed files, not all issues in the project

## Instructions

1. **Identify the task** from the user's request (audit, fix, find dupes, set up CI, migrate, debug)
2. **Run the appropriate command** with `--format json --quiet 2>/dev/null || true`
3. **Use filter flags** to limit output when the user asks about specific issue types
4. **Always dry-run before fix.** Show the user what will change, then apply
5. **Report results clearly.** Summarize issue counts, list specific findings, suggest next steps
6. **For false positives,** suggest inline suppression comments or config rule adjustments

If `$ARGUMENTS` is provided, use it as the `--root` path or pass it as the target for the appropriate fallow command.
