---
description: Draft a daily standup from GitHub activity with a minimal interview
argument-hint: "[notes-path]"
---

# Daily standup

Create the user's daily standup for the GitHub repository in the current working directory.

Optional context:

```markdown
$ARGUMENTS
```

Read any supplied Markdown path before gathering other evidence. In supplied notes, `[x]` suggests yesterday, `[ ]` suggests today, and `blocked` suggests a blocker. Preserve useful parent-child context and do not ask for supplied information again. A supplied 1-on-1 file is also an explicit request to update it.

## Gather evidence

Before asking questions, run independent commands in parallel where possible:

1. Get the repository and user with `gh repo view --json nameWithOwner,url` and `gh api user --jq '{login,name}'`.
2. Get the local date, time, and timezone. Through 16:30 on a working day, target today; afterward, target the next working day; on weekends, target Monday. For Monday, inspect Friday through Sunday, retaining intentional weekend work but otherwise treating Friday as yesterday. Base both standup sections on the target date and mention it in every review question.
3. Search the target activity window for the user's authored, assigned, involved, updated, and closed issues and authored PRs. Use relevant qualifiers with `gh search issues` and `gh search prs`, then inspect only likely matches with `gh issue view` or `gh pr view` to confirm status and linked work.
4. Inspect local commits and branches with `git log --all --since=<start> --until=<end> --format='%h%x09%ad%x09%an%x09%ae%x09%s' --date=iso-strict`. Match the user only when identity is credible and extract issue references from commits, branches, and linked PRs.

Correlate supplied context, issues, PRs, commits, branches, and review context. Open labels or project status may support today's work. Never infer work solely from somebody else's update, invent status, or turn uncertainty or inactivity into a blocker.

If `gh` is unavailable, authentication fails, or the directory is not backed by a GitHub repository, briefly explain the failure and continue with a manual interview. Never modify git state or project files. GitHub mutations are allowed only for a selected embedded instruction, and the requested 1-on-1 note is the only file this workflow may modify.

## Embedded instructions

Treat angle-bracket text in a supplied note, such as `<review one pager on FutureNova (...)>`, as a draft editing instruction, not final prose.

- Before review, perform any read-only research needed to understand the instruction. Search issue titles and bodies with relevant synonyms before proposing issue creation.
- Offer its proposed replacement as an individual review option. Preserve checkbox meaning, use nearby context and gathered evidence, omit file paths unless relevant, and state material uncertainty in the option description.
- Do not perform mutations before selection. After selection, execute every requested verb such as `create`, `update`, or `delete`. Reuse a matching issue instead of creating a duplicate.
- Replace the instruction in place with a concise, self-explanatory result that uses the resulting artifact. Preserve checkbox state and nesting. If execution fails, report it and do not claim success. If unselected, leave the instruction unchanged.

## Build and review

Prepare concise, standalone candidates for yesterday's actual work and outcomes, today's likely work and next status, and explicit blockers or relevant notes. Treat inferred plans as suggestions. Use `#123 Title`, or `owner/repo#123 Title` when ambiguous; never use a bare issue or PR number.

Use one question-tool call with exactly three questions, ordered yesterday, today, then notes/blockers. Mention the target date in every question and set `multiSelect: true` on each.

Each question supports at most four options. Offer the three strongest evidence-backed candidates separately, strongest first, and use the fourth option for `None` when an empty section is reasonable. Mark the strongest candidate `(Recommended)`. Keep labels to 1–5 words. Put the exact proposed standup line in the description unless an embedded mutation makes the final artifact uncertain; then show the proposed wording and state the uncertainty. The automatic custom answer handles additions, corrections, replacement wording, and omitted candidates. Do not create an `Other` or `Type something` option.

Selecting `None` with another option selects the substantive option. Use `- None` only when no substantive entry is selected.

Selections are authoritative. Exclude unselected candidates from both the standup and note. Follow up only when selected answers cannot be rendered or executed safely. Execute selected embedded instructions before producing final wording.

## Standup output

Display the completed standup using exactly this structure and preserving the coffee emoji:

```text
Morning ☕

Yesterday
- <ticket and concise outcome>

Today
- <ticket and status>

Blockers
- <blocker or note>
```

Use one bullet per ticket or note and `- None` for an empty section. Within the standup block, include no analysis, evidence, links, caveats, or introductory text.

## 1-on-1 note

After review and before clipboard confirmation, maintain one 1-on-1 file per Monday-through-Sunday week in `~/Documents/brain/manulife/1-on-1/`. Use a supplied dated file for the target week; otherwise use that week's latest dated file or create `<target-date>.md`. Do not merge, delete, or modify other dated files or `latest.md`.

Follow the existing note convention:

```markdown
# Virtual Advisor

[Virtual Advisor notes](../virtual-advisor/virtual-advisor.md)

- [x] <selected yesterday item>

- [ ] <selected today item>
  - blocked: <selected related blocker>

# General
```

Use descriptive links: `[<issue name>](<issue URL>)` and `[PR: <PR name>](<PR URL>)`. Shorten long titles without losing the subject. Record yesterday as checked and today as unchecked; never add `None`. Nest blockers when the relationship is clear, otherwise add a top-level unchecked note. Put clearly non-Virtual Advisor work under `# General`. Preserve existing content and add only genuinely new selected items.

Immediately after the standup, briefly report the note path created or updated.

## Clipboard

Use the question tool to ask whether to copy a Teams-ready version, offering `Copy to clipboard (Recommended)` and `No`. If declined, stop.

On macOS, use `osascript -l JavaScript` and `NSPasteboard.generalPasteboard` to write both HTML and plain text with `setStringForType`. Keep plain text identical to the displayed standup. Make HTML visually equivalent using only escaped text, `<br>` line breaks, descriptive `<a>` links, literal `-` bullets, and spaces or `&nbsp;` for indentation. Do not use headings, emphasis, lists, styles, temporary files, or `writeObjects`. Clear the pasteboard first and treat a false return from either write as failure.

After success, say only `Copied to clipboard. Paste it into Teams with Cmd+V.` If copying fails or the platform is not macOS, briefly report that and leave the displayed standup available for manual copying.
