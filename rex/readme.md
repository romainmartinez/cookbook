# Rex

## App settings

`init.lua` (with `jump.lua`, `nvim.lua` and `floats.lua`) only covers keybindings and actions. Settings changed in Rex.app live in `~/Library/Preferences/com.superlogical.rex.plist` (`defaults read com.superlogical.rex`), so reapply these by hand on a new machine:

- Theme: custom TokyoNight Storm (dark) and TokyoNight Day (light) (`Workspace.customThemes`, `darkThemeID`, `lightThemeID`), interface style follows the theme
- Font: JetBrainsMono Nerd Font Mono, 14pt, no font smoothing, cell height +20%
- Option key acts as Alt
- Smooth scrolling on
- Animation style: natural
- Padding: x 2, y 0, padding color extends the background
- Cursor: block, `warp` cursor shader on
- Copy on select on
- Terminal notifications on (`Workspace.allowsTerminalNotifications`, needed for the OSC 9 banners below)
- Program activity, done: notification on, `success` sound, Dock badge, shown in tabs (`Workspace.programActivityStatusPreferences`). These system notifications only fire while Rex is in the background. OSC 9 banners show even in front: `fish/mac.fish` for slow commands, `pi/extensions/rom-rex-notifications` for Pi done, error and blocked
- Tabs: vertical, program status shown in tabs, tab icons never colored, icon count 3, don't fill available space
- Sidebar: left, width 167, activity hidden
- Panes: comfortable density, headers hidden, active border hidden, inactive panes fade (both), tinted with the program background
- Hidden chrome buttons: activity, command palette, new tab
- Hidden pane buttons: all (close, float, minimize, split down, split right, zoom)
- App icon: Dock only
- Remote Control on (needed by the `rex` CLI)
- Agents naming sessions off (`fish/base.fish` names sessions)
- Developer mode on, update channel `snapshot`
- Experiment: new quick switcher on

## Modules

- `jump.lua`: remembers the pane you came from (until the config reloads); `cmd+;` (**Jump Back**) returns to it, and pressing it again toggles back. `jump_to` focuses a block for `lazygit-to-nvim.sh` and `yazi-to-nvim.sh`.
- `nvim.lua`: finds the session's nvim and defines the palette actions **GitHub Pull Requests in Neovim** and **GitHub Issues in Neovim**, which open the snacks `gh` pickers in it and focus it.
- `floats.lua`: the lazygit (`ctrl+g`) and yazi (`ctrl+e`) floats.

## nvim hand-off

The floats get the session's nvim from `nvim.lua`; `lazygit-to-nvim.sh` (via `lazygit/config.yml`) and `yazi-to-nvim.sh` open files in it and focus it with `jump_to`. The socket path `~/.cache/rex-nvim/<block>.sock` must match the lazyvim repo's `lua/config/options.lua`.

## TODO

### Omarchy

- [x] Install the Rex Linux server and pick a server mode
- [x] Add a Rex systemd service (`omarchy/readme.md`)
- [x] Expose it over Tailscale for the Mac and phone (Remote Access docs)
- [ ] Local use: Rex has no Linux client, so check web access

## Rex extras

- [ ] Project layout action (nvim + shell + agent) with `rex.layout`
- [x] iOS app over Tailscale (`rex server tailscale pair`, `omarchy/readme.md`)
- [ ] `rex.host` in `init.lua` for the Omarchy server
