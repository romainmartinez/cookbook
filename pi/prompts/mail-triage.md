---
description: Triage the Mail.app work inbox and propose flag, move, and mark-read actions
argument-hint: "[list options]"
---

# Mail Triage

Triage the user's Mail.app inbox. Options for `list`: `$ARGUMENTS`. If none are given, use `--unread`.

Control Mail.app through this JXA script:

```sh
~/.pi/agent/prompts/mail-triage.js <command> [args] [--account NAME] [--mailbox NAME]
```

Defaults: first account, mailbox `Inbox`. All output is JSON. Message `id` values are scoped to the mailbox, so pass the same `--mailbox` used to list them. Moving a message gives it a new id; list the destination mailbox again before acting on it.

| Command | Purpose |
|---|---|
| `accounts` | List accounts |
| `mailboxes` | List mailboxes with unread counts |
| `list [--limit 30] [--unread] [--since YYYY-MM-DD]` | Newest first summaries |
| `read <id> [--max 4000]` | Recipients and plain text body |
| `flag`, `unflag`, `mark-read`, `mark-unread <id>...` | Change status |
| `move <mailbox> <id>...` | Move to a mailbox of the same account |

## Workflow

1. `list` with the options above to get the candidates.
2. Classify from sender and subject. Only `read` bodies when the subject is ambiguous; this is corporate mail, so read the minimum needed.
3. Report in three groups: **Needs attention** (direct asks, action required, people waiting on the user), **FYI** (worth skimming), **Noise** (automated notifications like ServiceNow, GitHub, newsletters). Give one line per message with the reason, and collapse repeated notifications from the same thread.
4. Propose actions (flag, move, mark read) as a list, and wait for explicit confirmation before running any write command.
5. After writing, report what changed.

Never delete messages or send mail.
