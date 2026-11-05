# Rex parity with herdr

Tracks porting `herdr/` to `rex/init.lua`. Rex sessions = herdr workspaces, Rex windows = herdr tabs.

Rex will eventually replace ghostty + herdr + moshi. Once done, run a prompt to clean up the repo

## Parked changes outside `rex/`

Reverted until Rex leaves beta. Reapply when committing:

- `readme.md` (after the herdr setup): turn on Remote Control in Rex.app settings, free `cmd+space` from Spotlight, move any existing `~/.config/rex` aside, then:
  ```sh
  rex skill setup
  ln -sfn $CODE_FOLDER/cookbook/rex ~/.config/rex
  ```
- `fish/base.fish` (after the herdr hook): git ahead/behind in the session label, background fetch at most every 5 minutes:
  ```fish
  if set -q REX_SESSION
      function __rex_git_sync --on-event fish_prompt
          if git rev-list --left-right --count 'HEAD...@{upstream}' 2>/dev/null | read -l -d \t ahead behind
              if test (path mtime --relative (git rev-parse --git-path FETCH_HEAD); or echo 300) -ge 300
                  GIT_TERMINAL_PROMPT=0 command git fetch --quiet &>/dev/null &
                  disown
              end
          end

          set -l suffix (string match -r '.[1-9]\d*' ↑$ahead ↓$behind)
          set -q __rex_git_suffix; and test "$suffix" = "$__rex_git_suffix"; and return
          set -g __rex_git_suffix $suffix

          set -l label (rex session inspect $REX_SESSION --json | jq -r .label | string replace -r ' [↑↓].*' '')
          rex session rename $REX_SESSION (string join ' ' $label $suffix) &>/dev/null
      end
  end
  ```
- `pi/extensions/rom-rex-ask-user-state` (deleted, recreate it): Pi reports OSC 7501 `blocked` for built-in dialogs but not for `ctx.ui.custom`, so `ask_user_question` never shows as blocked in Rex. The extension listens to `rpiv:ask-user:prompt` / `rpiv:ask-user:blocked` and writes `state=blocked:kind=question:app=pi:id=ask-user-question/<toolCallId>:msg=<base64 question>` then `state=clear:id=...`. It uses a child record id because Pi dedupes its root record and would not resend `working`. Only active when `TERM_PROGRAM=rex` and `PI_PROGRAM_STATUS!=0`. Add a test beside it.

## Keys

- [x] `cmd+t` new tab (Rex default)
- [x] `cmd+w` close tab
- [x] `cmd+[` / `cmd+]` previous/next tab
- [x] `cmd+ctrl+[` / `cmd+ctrl+]` move tab
- [x] `cmd+shift+[` / `cmd+shift+]` previous/next workspace
- [x] `cmd+1..9` switch tab (Rex default)
- [x] `cmd+ctrl+1..9` switch workspace (custom action + `session.select`) -> not needed
- [x] `cmd+alt+[` / `cmd+alt+]` previous/next agent (no built-in) -> `cmd+.`

- [x] split -> cmd + d
- [x] split navigation -> cmd + alt + arrow

## Commands

- [x] `ctrl+g` lazygit: floats
  - [ ] nvim hand-off
- [x] `ctrl+e` yazi: floats
  - [ ] open-in-nvim chooser
- [x] `cmd+space` tab picker: floats `tab-picker.sh` + `tab-list.lua` with pane preview and `ctrl-x` close (needs Remote Control on in Rex.app settings to switch sessions; assumes one connected app client)
- [ ] nvim hand-off: port `find-nvim.sh`, socket naming, `lazygit/config.yml` `$HERDR_*` vars

## UI

- [x] tokyo-night theme (app setting)

## Plugins and integrations

- [ ] automatic tab rename (plugin + `fish/base.fish` hook; `init.lua` never receives events) -> maybe not needed? I think rex could support that out of the box
  ```fish
  if set -q REX_SESSION
      function __rex_session_label --on-variable PWD
          rex session rename $REX_SESSION (path basename $PWD) &>/dev/null &
          disown
      end
  end
  ```
- [x] git ahead/behind in the sidebar: `fish/base.fish` appends `↑N ↓N` to the session label and fetches in the background every 5 minutes
- [x] pi agent state (`rex skill setup`, OSC 7501)
- [x] `pi/extensions/rom-herdr-prompt-state` -> Pi reports OSC 7501 `blocked` for built-in dialogs; `pi/extensions/rom-rex-ask-user-state` covers `ask_user_question` (`ctx.ui.custom`)
- [ ] `pi/extensions/rom-git-push-confirmation`
- [ ] `pi/extensions/rom-session-title-sync`

## Omarchy

- [ ] Install the Rex Linux server and pick a server mode
- [ ] Replace `omarchy/systemd/herdr.service` with a Rex service
- [ ] Expose it over Tailscale for the Mac and phone (Remote Access docs)
- [ ] Local use: Rex has no Linux client, so check web access or keep herdr there
- [ ] Update `omarchy/readme.md`: herdr mise shim and "herdr as always-on server"

## Rex extras

- [ ] Key mode (`rex.mode`) for resizing and moving panes with plain keys
- [ ] Project layout action (nvim + shell + agent) with `rex.layout`
- [ ] `pane.go_to_directory` (`shift+cmd+g`) and `pane.insert_path` (`ctrl+cmd+i`)
- [ ] `client.prompt.previous` / `next` (`cmd+up` / `cmd+down`) to jump between prompts
- [ ] `rex do --all` script on `terminal.program_status_changed` for custom agent alerts
- [ ] Let agents name sessions (Settings > Integrations > Agent Behavior)
- [ ] iOS app over Tailscale (`client.pair_device`)
- [ ] `rex.host` in `init.lua` for the Omarchy server
