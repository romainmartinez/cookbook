---
description: generate a commit message for staged changes
---

Look at the staged changes below and generate a concise commit message.

Rules:
- Use conventional commit format: `type: description`
- Valid types: feat, fix, refactor, docs, style, test, chore, ci, perf, build
- The description should explain WHY the change was made, not WHAT was changed
- Keep the subject line under 72 characters
- Do NOT actually run `git commit` - only output the message
- After generating the message, copy it to the clipboard using `echo "<message>" | pbcopy`
- If there are no staged changes, say so and stop

## Staged changes

!`git diff --cached`

## Staged files

!`git status --short`
