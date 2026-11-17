---
description: Suggest lasting agent rules from my recent prompts in this project
argument-hint: "[--since 15d | --since YYYY-MM-DD | --all]"
---

# Memories

Review what I typed to Pi in this project and suggest lasting rules for future agents. Nothing is written until I keep it.

## Gather

Run `node ~/.pi/agent/prompts/memories.ts list $ARGUMENTS` from the current directory. It prints one batch of JSON, oldest first: the project `root`, the `messages` (each is my `prompt` and the agent `reply` it answered), `dismissed` rules I already rejected, and `done`. While `done` is false, run `list --since <next>` with the returned `next` value until `done` is true. Read every batch in full; never pipe the output through `head`, `jq`, or any other filter that drops text. If `remaining` is 0, say so, run `node ~/.pi/agent/prompts/memories.ts mark`, and stop.

Read the rules that already apply: `~/.pi/agent/AGENTS.md`, and the `AGENTS.md` or `CLAUDE.md` files from `root` down to the current directory.

## Select

A memory is a rule that would still be true and useful a month from now, in a different task. Each one is one of:

- **Decision:** how this project does something.
- **Preference:** what I like in results or process.
- **Correction:** me pushing back on something the agent did, so it does not happen again. My reaction to the previous reply counts.

Never a memory:

- A request, feature idea, or spec for what is being built now, even when it says "always".
- Questions, approvals, nudges, status, or thanks.
- Facts about the current bug or run.
- Anything already covered by the existing rules or the `dismissed` list, even reworded.

Most prompts contain no memory. Propose at most 4, strongest first, each as one imperative sentence under 160 characters, in the style of the file it would join. For each, decide its scope: **global** if it is about how I work with agents anywhere, **project** if it depends on this codebase.

## Ask

If there are no candidates, say so, run `mark`, and stop. Otherwise ask in a single question tool call, one question per candidate. Put the quoted words of mine that support it and the session date in the question text. Options, recommended scope first:

- **Keep in project**: append to `root`/AGENTS.md (or the existing CLAUDE.md).
- **Keep globally**: append to `~/.pi/agent/AGENTS.md`.
- **Dismiss**: never suggest it again.

A typed answer is a rewording to keep at the recommended scope.

## Write

For each kept rule, edit the target file: merge with a related rule instead of adding a near duplicate, place it under the most relevant existing heading, and match the file's tone and bullet style. Create the project `AGENTS.md` only if neither it nor `CLAUDE.md` exists. Then run:

```sh
node ~/.pi/agent/prompts/memories.ts dismiss "<rule>" ...   # only for dismissed rules
node ~/.pi/agent/prompts/memories.ts mark
```

Report how many prompts you read and over which dates, then what was written where in one line per rule.
