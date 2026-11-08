# Rex

Rex will eventually replace ghostty + herdr + moshi. Once done, run a prompt to clean up the repo.


## App settings

`init.lua` only covers keybindings. Settings changed in Rex.app live in `~/Library/Preferences/com.superlogical.rex.plist` (`defaults read com.superlogical.rex`), so reapply these by hand on a new machine:

- Theme: custom tokyo-night for dark and light (`Workspace.customThemes`, `darkThemeID`, `lightThemeID`), interface style follows the theme
- Font: JetBrainsMono Nerd Font Mono, 14pt, no font smoothing, cell height +20%
- Padding: x 2, y 0, padding color extends the background
- Cursor: block, `sweep` cursor shader on
- Copy on select on
- Tabs: vertical, program status shown in tabs, tab icons never colored
- Sidebar: left, width 167, activity hidden
- Panes: comfortable density, headers hidden, active border hidden, inactive panes fade (both), tinted with the program background
- Hidden chrome buttons: activity, command palette, new tab
- Hidden pane buttons: all (close, float, minimize, split down, split right, zoom)
- App icon: Dock only
- Remote Control on (needed by the `rex` CLI)
- Agents naming sessions off
- Developer mode on, update channel `snapshot`
- Experiment: new quick switcher on

## Parked changes

Kept out of the repo until Rex leaves beta. Reapply when committing.

### `readme.md` setup

After the herdr setup: turn on Remote Control in Rex.app settings, move any existing `~/.config/rex` aside, then:

```sh
rex skill setup
ln -sfn $CODE_FOLDER/cookbook/rex ~/.config/rex
```

### `fish/base.fish` git ahead/behind

After the herdr hook. Appends `↑N ↓N` to the session label and fetches in the background at most every 5 minutes:

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

### `pi/extensions/rom-rex-ask-user-state`

Deleted, recreate it. Pi reports OSC 7501 `blocked` for built-in dialogs but not for `ctx.ui.custom`, so `ask_user_question` never shows as blocked in Rex. The extension listens to `rpiv:ask-user:prompt` / `rpiv:ask-user:blocked` and writes `state=blocked:kind=question:app=pi:id=ask-user-question/<toolCallId>:msg=<base64 question>` then `state=clear:id=...`. It uses a child record id because Pi dedupes its root record and would not resend `working`. Only active when `TERM_PROGRAM=rex` and `PI_PROGRAM_STATUS!=0`. Add a test beside it.

## herdr parity

### Commands

- [x] `ctrl+g` lazygit float
- [x] `ctrl+e` yazi float
- [x] tab picker -> built into Rex
- [ ] nvim hand-off: port `find-nvim.sh`, socket naming, `lazygit/config.yml` `$HERDR_*` vars
  - [ ] lazygit edits open in nvim
  - [ ] yazi chooser opens in nvim

### Plugins and integrations

- [ ] automatic tab rename (herdr plugin + `fish/base.fish` hook; `init.lua` never receives events). Rex may support it out of the box, otherwise:
  ```fish
  if set -q REX_SESSION
      function __rex_session_label --on-variable PWD
          rex session rename $REX_SESSION (path basename $PWD) &>/dev/null &
          disown
      end
  end
  ```
- [ ] git ahead/behind in the sidebar (parked, see above)
- [ ] `pi/extensions/rom-herdr-prompt-state` -> `rom-rex-ask-user-state` (parked, see above)
- [ ] `pi/extensions/rom-git-push-confirmation`
- [ ] `pi/extensions/rom-session-title-sync`

### Omarchy

- [ ] Install the Rex Linux server and pick a server mode
- [ ] Replace `omarchy/systemd/herdr.service` with a Rex service
- [ ] Expose it over Tailscale for the Mac and phone (Remote Access docs)
- [ ] Local use: Rex has no Linux client, so check web access or keep herdr there
- [ ] Update `omarchy/readme.md`: herdr mise shim and "herdr as always-on server"

## Rex extras

- [ ] Project layout action (nvim + shell + agent) with `rex.layout`
- [ ] Let agents name sessions (Settings > Integrations > Agent Behavior)
- [ ] iOS app over Tailscale (`client.pair_device`)
- [ ] `rex.host` in `init.lua` for the Omarchy server
