---
description: generate commit(s) for current changes and commit them
---

Look at the changes below (staged and unstaged) and generate concise commit message(s).

Rules:

- Use conventional commit format: `type: description`
- Valid types: feat, fix, refactor, docs, style, test, chore, ci, perf, build
- The description should explain WHY the change was made, not WHAT was changed
- Keep the subject line under 72 characters
- If there are no changes at all, say so and stop
- Do NOT push to remote — only commit locally
- Trust the current changes and changed files provided below; do not inspect them again
- If the changes logically belong to a single commit, stage all files and commit once
- If the changes span multiple unrelated concerns (e.g. a bug fix and a new feature), split them into separate commits:
  1. Stage only the relevant files or hunks for the first commit, then run `git commit -m "<message>"`
  2. Repeat for each additional logical group of changes

## Current changes

Live results of `git diff --cached`:
<git-diff-cached>
!`git diff --cached`
</git-diff-cached>

Live results of `git diff`:
<git-diff>
!`git diff`
</git-diff>

## Changed files

Live results of `git status --short`:
<git-status>
!`git status --short`
</git-status>
