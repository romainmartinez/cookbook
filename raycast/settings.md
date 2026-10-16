# Raycast settings

Snapshot of `Raycast-X-2026-10-16 10.28.35.rayconfig` (Raycast 2.8.1, macOS 26). Hyper = `⌃⌥⇧⌘`.

## General

- Launcher: `Hyper Space`, open at login, no menu bar icon
- Dark appearance, Raycast Dark theme (custom Catppuccin Macchiato/Latte themes installed)
- Expanded window on the mouse screen, moves to the active Space
- Vim-motion navigation, arrow keys for pages, Esc pops back then closes
- Pop to root after 30 s, medium root search sensitivity, "improved" built-in hotkeys preset
- Weekly scheduled export to `~/Documents/cookbook/raycast`, skipped on battery

## Hotkeys

| Hotkey | Action | Alias |
| --- | --- | --- |
| `Hyper Space` | Raycast | |
| `Hyper X` | AI Chat | `a` |
| `Right ⌘ ⌘` (double tap) | Send focused window to AI | |
| `Hyper C` | Clipboard history | |
| `Hyper S` | Search files | `ff` |
| `Hyper E` | Emoji picker | `fe` |
| `Hyper =` | Dictation | |
| `Hyper M` | My schedule (calendar) | |
| `Hyper 3` | Raycast Notes | `pn` |
| `Hyper Tab` | Switch windows | |
| `Hyper R` | Show desktop | |
| `Hyper V` | Toggle microphone mute | `sv` |
| `Hyper 5` | Confetti | |
| `Hyper -` | Draw on screen (script command) | |
| `⇧⌘V` | Paste as plain text | |
| `⇧⌘2` | CleanShot capture text | |

### Apps

| Hotkey | App | Alias |
| --- | --- | --- |
| `Hyper F` | Ghostty | |
| `Hyper B` | Google Chrome Beta | |
| `Hyper N` | Obsidian | |
| `Hyper T` | Todoist | |
| `Hyper P` | Spotify | |
| `Hyper U` | Figma | |
| `Hyper O` | Outlook | `po` |
| `Hyper G` | Teams | `pt` |
| `Hyper W` | Mission Control | |
| | Excel / PowerPoint / Word | `pe` / `pp` / `pw` |
| | Messages | `pm` |
| | System Settings | `st` |
| | Finder | `f` |

### Window management

No gaps. Cycle mode: displays. Layout "Coding" puts two windows side by side at 50/50.

| Hotkey | Action | Alias |
| --- | --- | --- |
| `Hyper Return` | Maximize | `w` |
| `Hyper [` | Left half | `wh` |
| `Hyper ]` | Right half | `wl` |
| `Hyper \` | Next display | `wn` |
| | Top / bottom half | `wk` / `wj` |

## Other aliases

| Alias | Command |
| --- | --- |
| `ac` | Search AI commands |
| `rq` | Search quicklinks |
| `rt` | Raycast Store |
| `sl` / `ss` | Lock screen / Shut down |
| `sq` / `sqq` | Quit all apps (no warning) / all except frontmost |
| `gi` / `gp` | GitHub my issues / my PRs |
| `pml` / `pmn` / `pmo` | Messages: list / send / paste latest OTP |
| `fg` | GIF search |

Favorites: Vim Leader Key, Toothpick (Bluetooth), Set Audio Output Device.

## Quicklinks

| Name | Link | Alias |
| --- | --- | --- |
| YouTube | `https://www.youtube.com/` | `by` |
| virtual-advisor project | `https://github.com/orgs/mfc-gwam/projects/18` | `gb` |

## Snippets

Expand immediately, not within words.

- Personal (values omitted): `~name`, `~em` email, `~mm` work email, `~cell`, `~add` address, `~work` work address, `~pc` postal code
- Dynamic: `~date`, `~time`, `~day`, `~!` code block, `~cl` `console.log()`, uv script header (no keyword)
- Prompts: `~qq` question tool, `~qa` needs assessment, `~idio` idiomatic code, `~@` "Continue"
- Shell: `!empty` find empty files and dirs
- Symbols: `~x` ×, `~division` ÷, `~+-` ±, `~1/2` ½, `~1/3` ⅓, `~1/4` ¼, `~infinity` ∞, `~check` ✓, `~cmd` ⌘, `~-` —, `~eur` €, `~usd` $, `~shrug` ¯\\\_(ツ)\_/¯, `~up` ↑, `~down` ↓, `~left` ←, `~right` →, `~lr` ↔

## AI

- AI Chat, Quick AI, and AI commands: Claude Sonnet 5.5, low reasoning effort
- Main chat preset: Claude Sonnet 5, balanced routing, memory enabled, web tool on in the main preset
- New chat after 5 min, never auto-archive
- Skill directories: `~/.claude/skills`, `~/.config/agents/skills`, `~/.agents/skills`
- Dictation: auto language, paste output, mute while recording
- Custom AI commands: Improve Writing (Sonnet 5.5), Improve Prompting (Sonnet 5.5, highlight edits), Translate to Language (GPT-5.4 mini)

## Built-in extensions

- Clipboard history: 1 week, OCR on, ignores Passwords and Keychain Access
- File search: `~` and `/Applications`, ignores `node_modules`, caches, tmp
- Script command folder: `~/Documents/brain/coding/scripts/raycast`
- Calendar: opens Google links in Chrome Beta, no auto-join
- Applications: hotkeys toggle the app
- Fallback order: file search, store, define word (disabled), snippets, AI on selected text, weather, AI Chat, translate, calendar, emoji, location, Focus, browser, menu items
- Disabled: Define Word, Freeform

## Store extensions

audio-device, bitwarden, brew, calendar, clean-keyboard, cleanshotx, color-picker, font-sniper, gif-search, git, github, iconify, imessage-2fa, installed-extensions, jira, kill-process, messages, model-context-protocol-registry, mute-microphone, paste-as-plain-text, port-manager, raycast-explorer, raycast-system-monitor, renaming, ruler, shell, sips, todoist, toothpick, vim-leader-key

Most single-purpose subcommands are disabled (Toothpick device actions, audio combos, extra Todoist, GitHub, and CleanShot commands).

## Usage

From the export's activity log (2025-06-21 to 2026-10-14). "90d" = since 2026-07-16. Counts merge the old and new command IDs from the Raycast 2 migration. A hotkey and an alias count the same, so the log can't tell which one you used.

### Most used (90d)

| Command | 90d | All time |
| --- | --- | --- |
| Clipboard History | 484 | 4000 |
| Raycast Notes | 468 | 3249 |
| Maximize | 325 | 1650 |
| Search Files | 208 | 876 |
| Toggle Mute Mic | 147 | 2180 |
| Dictate | 134 | 346 |
| CleanShot Capture Text | 121 | 276 |
| AI Chat | 102 | 3926 |
| Cisco Secure Client (root search) | 96 | 187 |
| Emoji | 72 | 487 |
| Right Half / Left Half | 71 / 63 | 744 / 336 |
| Messages (`pm`) | 66 | 134 |
| Quit All Apps (`sq`) | 66 | 477 |
| MongoDB Compass (root search) | 65 | 115 |
| Shut Down (`ss`) | 49 | 352 |
| virtual-advisor quicklink (`gb`) | 44 | 44 |
| My Schedule | 42 | 521 |
| GIF search (`fg`) | 40 | 133 |
| Finder (`f`) | 39 | 75 |
| Improve Writing (AI) | 37 | 540 |

App hotkeys, by app activations in the last 90 days: Ghostty 10.6k, Chrome Beta 10.5k, Teams 7.3k, Outlook 368, Todoist 172, Figma 87, Obsidian 78, Spotify 63, Mission Control 55.

Top snippets: `~!` (905), `~idio` (303), `~qq` (211), `~mm` (194), `~em` (147), `~add` (57).
