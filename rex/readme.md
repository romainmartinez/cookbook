# Rex

## App settings

`init.lua` only covers keybindings. Settings changed in Rex.app live in `~/Library/Preferences/com.superlogical.rex.plist` (`defaults read com.superlogical.rex`), so reapply these by hand on a new machine:

- Theme: custom tokyo-night for dark and light (`Workspace.customThemes`, `darkThemeID`, `lightThemeID`), interface style follows the theme
- Font: JetBrainsMono Nerd Font Mono, 14pt, no font smoothing, cell height +20%
- Option key acts as Alt
- Smooth scrolling on
- Animation style: natural
- Padding: x 2, y 0, padding color extends the background
- Cursor: block, `sweep` cursor shader on
- Copy on select on
- Terminal notifications on (`Workspace.allowsTerminalNotifications`, needed for the OSC 9 banners below)
- Program activity: system notifications off (they only fire while Rex is in the background). Banners come from OSC 9 instead, which Rex shows even in front: `fish/mac.fish` for slow commands, `pi/extensions/rom-rex-notifications` for Pi done, error and blocked
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

## Parked changes

Kept out of the repo until Rex leaves beta. Reapply when committing. Rex-only fish hooks are already in `fish/` behind `REX_SESSION`.

### `readme.md` setup

Turn on Remote Control in Rex.app settings, move any existing `~/.config/rex` aside, then:

```sh
rex skill setup
ln -sfn $CODE_FOLDER/cookbook/rex ~/.config/rex
```

## TODO

### nvim hand-off

Port the old herdr `find-nvim.sh` flow (`git show 8a2da63:herdr/find-nvim.sh`): find the nvim of the current Rex session and expose it to the `ctrl+g` / `ctrl+e` floats.

- [ ] lazygit edits open in nvim (`lazygit/config.yml` already uses `$NVIM`)
- [ ] yazi chooser opens in nvim

### Omarchy

- [ ] Install the Rex Linux server and pick a server mode
- [ ] Add a Rex systemd service
- [ ] Expose it over Tailscale for the Mac and phone (Remote Access docs)
- [ ] Local use: Rex has no Linux client, so check web access

## Rex extras

- [ ] Project layout action (nvim + shell + agent) with `rex.layout`
- [ ] iOS app over Tailscale (`client.pair_device`)
- [ ] `rex.host` in `init.lua` for the Omarchy server
