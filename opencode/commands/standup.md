---
description: draft a daily standup from GitHub activity with a minimal interview
---

# Daily standup

Create the user's daily standup for the GitHub repository in the current working directory.

Use this optional context:

```markdown
$ARGUMENTS
```

Parse headings and nested checklists as evidence: `[x]` suggests yesterday, `[ ]` suggests today, and `blocked` suggests a blocker. Preserve useful parent-child context and do not ask for supplied information again. Read any supplied Markdown path first; a supplied 1-on-1 file is also an explicit request to update it.

Treat angle-bracket text in a supplied note, such as `<review one pager on FutureNova (...)>`, as a draft editing instruction, never final prose:

- Treat every instruction inside the angle brackets as required work when its replacement is selected. Execute verbs such as `search`, `create`, `update`, and `delete`; do not silently omit them.
- Search issue titles and bodies with relevant synonyms before creating an issue. Reuse a matching issue; otherwise create a concise one. Use the resulting artifact in the replacement and standup, and do not claim failed actions succeeded.
- Rewrite it as a self-explanatory item using nearby context and gathered evidence. Inspect referenced local files only enough to identify the subject and purpose; omit paths unless relevant.
- Preserve its checkbox meaning and offer the exact replacement as an individual review option. State material uncertainty in the option description.
- If selected, replace it in place while preserving checkbox state and nesting. If unselected, leave it unchanged.

## Core rules

- Make each item concise and understandable without GitHub context. State the subject and supported outcome, status, next step, or blocker.
- Correlate issues, PRs, commits, branches, supplied context, and review context. Never infer work solely from somebody else's update, invent issue status, or turn uncertainty or inactivity into a blocker.
- Selections are authoritative. Exclude unselected candidates from the standup and note, even when supported by evidence.
- Use descriptive issue and PR references. In the standup use `#123 Title`, or `owner/repo#123 Title` when ambiguous. In the note use `[<issue name>](<issue URL>)` and `[PR: <PR name>](<PR URL>)`; never use a bare number or URL.

## Gather context

Before asking questions, use Bash to gather this evidence, running independent commands in parallel:

1. Repository and user: `gh repo view --json nameWithOwner,url` and `gh api user --jq '{login,name}'`.
2. Local date, time, timezone, and target date: through 16:30 on a working day target today; afterward target the next working day; on weekends target Monday. Base both sections on that target and mention it in every review question. For Monday, inspect Friday through Sunday, retaining intentional weekend work but otherwise treating Friday as yesterday.
3. Assigned issues: `gh issue list --assignee <login> --state all --limit 100 --json number,title,state,url,updatedAt,closedAt,labels,milestone`. Also use `gh search issues --repo <owner/repo>` with relevant `assignee:`, `author:`, `involves:`, `updated:`, and `closed:` qualifiers for changed issues.
4. Authored PRs: `gh search prs --repo <owner/repo> --author <login> --updated <range> --json number,title,state,url,updatedAt,closedAt,mergedAt`. Inspect likely PRs with `gh pr view` for linked issues.
5. Local commits and branches: `git log --all --since=<start> --until=<end> --format='%h%x09%ad%x09%an%x09%ae%x09%s' --date=iso-strict`. Match identity only when credible and extract issue references from commits, branches, and linked PRs. Use open issue labels or project status only as evidence for today's work.

If `gh` is unavailable, authentication fails, or the directory is not backed by a GitHub repository, briefly explain the failure and continue with a manual interview. Never modify git state or files in the current project. Do not modify GitHub except to perform an explicit action from a selected angle-bracket instruction. The requested 1-on-1 note is the only file this workflow may modify.

## Build a draft

Prepare proposals for yesterday's actual work and supported outcomes, today's likely work and status or next step, and explicit blockers or relevant notes. Treat inferred plans as suggestions.

## Review

For the standup review, use one Question call with exactly three questions, ordered yesterday, today, then notes/blockers. Set `multiple: true` on every question. Offer every evidence-backed candidate as its own option. Keep labels to 1-5 words and put only the exact proposed standup line in the description, except when material uncertainty needs stating. Do not offer an all-or-nothing option.

- Put strongest candidates first and mark the best default label `(Recommended)`.
- Include a `None` option when leaving the section empty is reasonable.
- Let the automatically provided custom answer capture additions, corrections, replacement wording, or missing work.
- Treat selecting `None` with another option as selecting the other option. Use `- None` only when `None` is selected alone or no substantive entry is selected.

Offer completed work under yesterday, planned or continuing work under today with status in its label, and each note or blocker separately. Follow up only when selected answers cannot be rendered safely.

## Output and clipboard

After the interview, show the completed standup in this exact structure, preserving the coffee emoji:

```text
Morning ☕

Yesterday
- <ticket and concise outcome>

Today
- <ticket and status>

Blockers
- <blocker or note>
```

Use one bullet per ticket or note. Use `- None` when a section is empty. Do not include analysis, evidence, links, caveats, or an introductory sentence in the final output.

## 1-on-1 entry

After review and before clipboard confirmation, maintain one 1-on-1 file per Monday-through-Sunday week in `~/Documents/brain/manulife/1-on-1/`. Use a supplied dated file for the target week; otherwise use that week's latest dated file, or create `<target-date>.md`. Do not merge or delete other files.

Follow the existing note convention:

```markdown
# Virtual Advisor

[Virtual Advisor notes](../virtual-advisor/virtual-advisor.md)

- [x] <selected yesterday item>

- [ ] <selected today item>
  - blocked: <selected blocker when clearly related>

# General
```

- Shorten long titles while keeping the subject clear. Names may clarify ownership but cannot replace subject and outcome.
- Record selected yesterday items as checked and selected today items as unchecked. Do not add `None` entries.
- Nest a selected blocker under its related item when the relationship is clear. Otherwise add it as a top-level unchecked note.
- Put clearly non-Virtual Advisor work under `# General`.
- Preserve existing content and add only genuinely new selected items. Do not modify `latest.md` or any other dated note.
- Briefly report the path created or updated immediately after displaying the standup.

After showing the standup, ask whether to copy a Teams-ready version to the clipboard, offering `Copy to clipboard (Recommended)` and `No`. If declined, stop without a clipboard command.

If the user accepts and the platform is macOS, use `osascript -l JavaScript` to write both HTML and plain-text representations to `NSPasteboard.generalPasteboard`:

- Keep plain text identical to the displayed standup and HTML visually equivalent, including literal `-` bullets and indentation.
- Link issue and PR names in HTML with descriptive text, never bare URLs.
- Apply no rich-text formatting except links. Build the HTML only from text, `<br>` line breaks, and `<a>` elements. Do not use headings, bold, italics, `<ul>`, `<ol>`, `<li>`, or styled elements. Render bullets as literal `-` characters and nested indentation as spaces or `&nbsp;`.
- Clear the pasteboard, then write HTML and plain text with `setStringForType`. Never use `writeObjects`, which JXA may bridge incorrectly as `__NSDictionaryM`.
- Treat a false return from either write as failure.
- Do not modify project files or create a temporary file.

After a successful copy, say only `Copied to clipboard. Paste it into Teams with Cmd+V.` If the clipboard command fails or the platform is not macOS, briefly state that it could not be copied and leave the already displayed standup available for manual copying.
