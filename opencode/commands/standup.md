---
description: draft a daily standup from GitHub activity with a minimal interview
---

# Daily standup

Create the user's daily standup for the GitHub repository in the current working directory.

Use the following optional context. It may name tickets, PR reviews, branches, completed or pending checklist items, blockers, notes, or a corrected date range:

```markdown
$ARGUMENTS
```

Parse headings and nested Markdown checklists as structured evidence. Completed items (`[x]`) are likely yesterday candidates, incomplete items (`[ ]`) are likely today candidates, and explicit `blocked` text is a blocker candidate. Preserve useful parent-child context, but condense it for standup output. Do not make the user repeat information supplied there.

If the optional context contains a path to a Markdown file, including a `~/...` or absolute path, read that file before gathering candidates. A supplied 1-on-1 file is both context and an explicit request to update that weekly note.

Treat text enclosed in angle brackets inside a supplied note, such as `- [ ] <review one pager on FutureNova (~/Downloads/va-backups/FutureNova Capabilities.docx)>`, as a draft editing instruction, never as final prose:

- Rephrase the contents into a concise, self-explanatory work item. Never copy the angle brackets or placeholder wording into the standup or saved note.
- Preserve the checkbox's intent: `[x]` is a yesterday candidate and `[ ]` is a today or upcoming-work candidate. Classify explicit blockers or notes in their corresponding review section.
- Use nearby headings, parent tasks, the rest of the note, and gathered GitHub context to make the result understandable on its own.
- If the instruction references a readable local file, inspect only enough of it to identify the document's subject and the purpose of the work. Do not expose its local path in the final wording unless the path itself is relevant.
- Offer the rewritten item as an individual option in the relevant review question. The option description must show the exact proposed replacement.
- If selected, replace the original angle-bracket item in place while preserving its checkbox state and nesting. Do not append a duplicate. If unselected, leave the original placeholder unchanged.
- If the intended wording remains materially ambiguous after inspecting available context, make that uncertainty explicit in the option description and let the custom answer provide the missing intent.

## Gather context

Before asking questions, use the Bash tool to gather evidence. Run independent commands in parallel where possible.

1. Determine the repository with `gh repo view --json nameWithOwner,url` and the authenticated user with `gh api user --jq '{login,name}'`.
2. Determine the user's local date, time, timezone, and the standup target date before querying activity. At or before 16:30 local time, the target date is today. After 16:30, the user is preparing the next morning's standup, so the target date is tomorrow. Derive the "yesterday" and "today" sections relative to that target date, not necessarily the wall-clock date. Tell the user the target date in the review questions. The standup is normally submitted between 09:00 and 09:30. If the target date is Monday, also inspect Friday through Sunday so weekend activity is not missed, but keep clearly intentional weekend work and otherwise prioritize Friday as "yesterday" for standup purposes.
3. List up to 100 issues assigned to the authenticated user, including open and recently closed issues, with `gh issue list --assignee <login> --state all --limit 100 --json number,title,state,url,updatedAt,closedAt,labels,milestone`.
4. Search the repository's issues for items involving the authenticated user that changed during the date range. Use `gh search issues --repo <owner/repo>` with relevant `assignee:`, `author:`, `involves:`, `updated:`, and `closed:` qualifiers. Include enough fields to identify ticket number, title, state, URL, and timestamps. Do not treat an issue as worked on solely because somebody else updated it.
5. List the user's pull requests updated during the date range with `gh search prs --repo <owner/repo> --author <login> --updated <range> --json number,title,state,url,updatedAt,closedAt,mergedAt` and inspect likely relevant PRs with `gh pr view` to find linked issues.
6. Inspect local commits across all refs during the date range with `git log --all --since=<start> --until=<end> --format='%h%x09%ad%x09%an%x09%ae%x09%s' --date=iso-strict`. Match the authenticated user by name, login, or email only when the identity is credible. Inspect the current and relevant recent branch names. Extract issue references from branch names, commit messages, and linked PRs.
7. Inspect open assigned issues and available labels or project status as evidence for today's likely work and status. Do not invent a status from an issue being open.

If `gh` is unavailable, authentication fails, or the directory is not backed by a GitHub repository, briefly explain the failure and continue with a manual interview. Never modify GitHub, git state, or files in the current project. The requested 1-on-1 note is the only file this workflow may modify.

## Build a draft

Correlate issue, PR, and commit evidence into ticket candidates. Prefer references formatted as `owner/repo#123 Title` when the repository context could be ambiguous, otherwise `#123 Title`. Include non-ticket work only when supported by activity or supplied context.

Prepare concise proposals for:

- Yesterday: tickets actually worked on, with a short plain-language outcome when evidence supports one.
- Today: likely tickets plus a concise status such as `in progress`, `review`, `blocked`, or a specific next step. Treat these as suggestions unless the evidence is explicit.
- Blockers or notes: infer only explicit blockers or relevant facts. Never turn uncertainty or inactivity into a blocker.

## Review

Use the Question tool once with exactly three questions in one call, ordered yesterday, today, then notes/blockers. Set `multiple: true` on every question. Each candidate must be its own option so the user can select several entries with minimal typing. Keep option labels to 1-5 words and put the complete proposed wording in the option description. Do not offer one all-or-nothing `Use suggestions` option.

- Put the strongest, evidence-backed candidates first and mark the best default candidate label `(Recommended)`.
- Include enough detail in each option description to explain the proposed wording, status, or supporting evidence.
- Include a `None` option when leaving the section empty is reasonable.
- Let the automatically provided custom answer capture additions, corrections, replacement wording, or missing work.
- Treat selecting `None` with another option as selecting the other option. Use `- None` only when `None` is selected alone or no substantive entry is selected.

The yesterday question offers each likely completed ticket or work item. The today question offers each likely planned or continuing item and includes its proposed status in the label. The notes/blockers question offers each blocker or relevant note separately. Mention the target standup date in all three question texts. If a proposal is too uncertain, say so in its description instead of pretending confidence. Only ask a follow-up if the selected answers or custom text genuinely cannot be rendered safely.

Selections are authoritative. Do not include unselected candidates in the standup or note, even if GitHub evidence supports them.

## Output and clipboard

After the interview, show the completed standup in this exact structure, preserving the coffee emoji:

```text
Good morning ☕


Tickets worked on yesterday
- <ticket and concise outcome>

Tickets working on today, with status
- <ticket and status>

Any blockers or other relevant notes
- <blocker or note>
```

Use one bullet per ticket or note. Use `- None` when a section is empty. Do not include analysis, evidence, links, caveats, or an introductory sentence in the final output.

## 1-on-1 entry

After the review and before offering clipboard copy, maintain one 1-on-1 file per calendar week, using Monday through Sunday as the week boundary.

1. List dated Markdown files in `~/Documents/brain/manulife/1-on-1/` and identify any file whose `YYYY-MM-DD` filename falls in the target date's week.
2. If the user supplied a dated 1-on-1 file for the target week, update that file. Otherwise, if one exists, update it regardless of which day it is named after. For example, a standup prepared for Thursday 2026-09-03 updates `2026-09-02.md` because both dates are in the same week.
3. If none exists, create `~/Documents/brain/manulife/1-on-1/<target-date>.md`, where `<target-date>` is the standup target date in `YYYY-MM-DD` format. A standup in the following week must create a new file rather than update the previous week's file.
4. If multiple dated files exist for the target week, update the latest one and do not merge or delete the others.

Follow the existing note convention and keep the entry quick and concise:

```markdown
# Virtual Advisor

[Virtual Advisor notes](../virtual-advisor/virtual-advisor.md)

- [x] <selected yesterday item>

- [ ] <selected today item>
  - blocked: <selected blocker when clearly related>

# General
```

- Use concise work summaries. Every referenced GitHub issue must be a descriptive Markdown link in the form `[<issue name>](<issue URL>)`. Every referenced pull request must use the exact form `[PR: <PR name>](<PR URL>)`. Never write a bare number such as `#182` or `PR #188`, and never use the number alone as the link text. Shorten an excessively long GitHub title when needed, but keep the subject clear.
- Make every entry understandable without GitHub context. State what was implemented, reviewed, decided, or blocked and why it matters. Resolve vague references using the issue or PR title, body, linked issue, and review context gathered with `gh`.
- Never write person-only or action-only entries such as `review Nate's PR #204`. Prefer a concise standalone summary such as `reviewed [PR: server-managed conversation history](https://github.com/example/repo/pull/204); awaiting alignment with Ian on a shared US/Canada approach`.
- Names may clarify ownership, but cannot substitute for the subject and outcome of the work.
- Record selected yesterday items as checked and selected today items as unchecked. Do not add `None` entries.
- Nest a selected blocker under its related item when the relationship is clear. Otherwise add it as a top-level unchecked note.
- Put clearly non-Virtual Advisor work under `# General`.
- If the target file exists, preserve its content and merge only genuinely new selected items into the appropriate sections. Never overwrite or duplicate existing notes.
- Do not modify `latest.md` or any other dated note.
- Briefly report the path created or updated immediately after displaying the standup.

After showing the standup, use the Question tool to ask whether to copy a Teams-ready version to the user's clipboard. Offer these choices:

- `Copy to clipboard (Recommended)`
- `No`

If the user declines, stop without running a clipboard command.

If the user accepts and the platform is macOS, use `osascript -l JavaScript` to write both HTML and plain-text representations to `NSPasteboard.generalPasteboard`:

- Keep the plain-text representation identical to the displayed standup.
- Keep the HTML visually equivalent to the displayed standup, including section spacing and bullets.
- Turn each referenced issue name and PR name into an HTML `<a>` element using its GitHub URL. Use descriptive linked text such as `#182 Enable structured-data prototyping` or `PR #188 GHI-182: enable structured-data prototyping`, not a bare URL.
- Set both `NSPasteboardTypeHTML` and `NSPasteboardTypeString` so Teams can paste rich links while other applications retain a plain-text fallback.
- Do not modify project files or create a temporary file.

After a successful copy, say only `Copied to clipboard. Paste it into Teams with Cmd+V.` If the clipboard command fails or the platform is not macOS, briefly state that it could not be copied and leave the already displayed standup available for manual copying.
