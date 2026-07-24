# Setup Instructions

> [!NOTE]
> Why not an automated script?
>
> Because setting up a new computer is a great opportunity to review and
> reconsider which applications and settings you actually want to use.

Most instructions target a mac computer.
In case of setting up a omarchy server, use `/omarchy`.

## Homebrew

Install [brew](https://brew.sh/), then use it to install everything below.

## Terminal & Shell

- fish
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/fish/mac.fish ~/.config/fish/config.fish
  ```
- ghostty
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/ghostty/mac.config ~/.config/ghostty/config
  ```
- television
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/television ~/.config/television
  ```

## Search & Navigation

- fzf
- ripgrep
- fd
- zoxide

## File Management

- lsd
- superfile (config file symlinked individually; runtime state and default hotkeys stay in the same dir)
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/superfile/config.toml ~/Library/Application\ Support/superfile/config.toml
  ```

Missing features from the previous Yazi setup (no native/config equivalent):
- [ ] cd on exit
- [ ] Git status overlay on files/folders. No superfile plugin exists; use lazygit separately.
- [ ] Television integration
  - [ ] Content grep to nvim at match (was `<C-f>` via television). superfile search only filters filenames in the current dir; run `tv` from the shell instead.
- [ ] nvim integration (was yazi.nvim `<leader>e` / `<leader>E`). Buildable with `spf --chooser-file` glue in the nvim repo, not a drop-in plugin.
  - [ ] update nvim repo to drop yazi
  - [ ] should we do it in herdr instead?

## Dev Tools

- uv
- mole
- curl
- gh
- opencode
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc
  ln -sfn $CODE_FOLDER/cookbook/opencode/tui.jsonc ~/.config/opencode/tui.jsonc
  ln -sfn $CODE_FOLDER/cookbook/opencode/AGENTS.md ~/.config/opencode/AGENTS.md
  ln -sfn $CODE_FOLDER/cookbook/opencode/commands ~/.config/opencode/commands
  ln -sfn $CODE_FOLDER/cookbook/opencode/skills ~/.config/opencode/skills
  ```
- lazygit (config file only; runtime state in `state.yml` stays in the same dir)
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/lazygit/config.yml ~/Library/Application\ Support/lazygit/config.yml
  ```
- neovim (LazyVim)
  ```sh
  gh repo clone romainmartinez/lazyvim.git ~/.config/nvim
  ```
- zed
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/editors/zed-settings.json ~/.config/zed/settings.json
  ln -sfn $CODE_FOLDER/cookbook/editors/zed-keymaps.json ~/.config/zed/keymap.json
  ```
- vscode (install extensions from `editors/vscode-extensions.txt`)
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/editors/vscode-settings.json ~/Library/Application\ Support/Code/User/settings.json
  ln -sfn $CODE_FOLDER/cookbook/editors/vscode-keybindings.json ~/Library/Application\ Support/Code/User/keybindings.json
  ```
- herdr
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/herdr/config.toml ~/.config/herdr/config.toml
  herdr integration install opencode
  ```

## Monitoring & Help

- btop
- tldr

## Fonts

- font-jetbrains-mono-nerd-font

## GUI Apps

- raycast
  - then remove vscode, chrome, edge, zoom defaults or other apps that are not needed
- cleanshot
- obsidian
- todoist
- karabiner-elements
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/karabiner.json ~/.config/karabiner/karabiner.json
  ```
- thaw
- chrome
- spotify
- figma
- teams
- word, excel, powerpoint

## System Preferences

Manual steps:
- Install certificate
  - `sudo cp ~/Downloads/manulife-cacert.pem /usr/local/share/ca-certificates/manulife-cacert.pem`
- Prefer ethernet over wifi
- Prefer tabs: always
- Hide tags in Finder
- Switch to a Space with open windows for the application: false
- Displays have separate Spaces: false

`defaults write` commands:
```sh
# Keyboard: disable press-and-hold, fast repeat
defaults write -g ApplePressAndHoldEnabled -bool false
defaults write -g KeyRepeat -int 2
defaults write -g InitialKeyRepeat -int 15

# Appearance: auto switch dark/light
defaults write -g AppleInterfaceStyleSwitchesAutomatically -bool true

# Scroll: disable natural scroll direction
defaults write -g com.apple.swipescrolldirection -bool false

# Trackpad: increase speed, tap to click
defaults write -g com.apple.trackpad.scaling -float 3
defaults write com.apple.AppleMultitouchTrackpad Clicking -bool true

# Mouse: increase speed
defaults write -g com.apple.mouse.scaling -float 2.5

# Dock: autohide, tiny tiles, magnification, minimize to app, no recents
defaults write com.apple.dock autohide -bool true
defaults write com.apple.dock tilesize -int 25
defaults write com.apple.dock magnification -bool true
defaults write com.apple.dock largesize -int 85
defaults write com.apple.dock minimize-to-application -bool true
defaults write com.apple.dock show-recents -bool false

# Spaces: no auto-rearrange, no drag-to-mission-control
defaults write com.apple.dock mru-spaces -bool false
defaults write com.apple.dock enterMissionControlByTopWindowDrag -bool false

# Window Manager: disable tiling, hide desktop on click, hide widgets, group by app
defaults write com.apple.WindowManager EnableTilingByEdgeDrag -bool false
defaults write com.apple.WindowManager EnableTilingOptionAccelerator -bool false
defaults write com.apple.WindowManager EnableTopTilingByEdgeDrag -bool false
defaults write com.apple.WindowManager HideDesktop -bool true
defaults write com.apple.WindowManager StandardHideWidgets -bool true
defaults write com.apple.WindowManager AppWindowGroupingBehavior -bool true

# Finder: column view, open new windows at /, show path bar, show extensions
defaults write com.apple.finder FXPreferredViewStyle -string clmv
defaults write com.apple.finder NewWindowTarget -string PfVo
defaults write com.apple.finder ShowPathbar -bool true
defaults write -g AppleShowAllExtensions -bool true

# Prevent .DS_Store on network drives
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true

# Disable auto-capitalization and double-space period
defaults write -g NSAutomaticCapitalizationEnabled -bool false
defaults write -g NSAutomaticPeriodSubstitutionEnabled -bool false

# Restart affected services
killall Dock Finder
```
