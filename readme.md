# Mac Setup Instructions

> [!NOTE]
> Why not an automated script?
>
> Because setting up a new Mac is a great opportunity to review and
> reconsider which applications and settings you actually want to use.

## Homebrew

Install [brew](https://brew.sh/), then use it to install everything below.

## CLI Tools

**Shell**
- fish

**Search & navigation**
- television (primary picker, replaces fzf bindings in fish)
- fzf (kept as a dependency for other tools)
- ripgrep
- fd
- zoxide

**File management**
- lsd
- yazi

**Dev**
- gh
- uv
- lazygit
- mole
- curl

**Monitoring & help**
- btop
- tldr

**Fonts**
- font-jetbrains-mono-nerd-font

## Terminal & Shell

**Ghostty**
```sh
ln -s ~/Documents/cookbook/ghostty.config ~/.config/ghostty/config
```

**Fish**
```sh
ln -s ~/Documents/cookbook/config.fish ~/.config/fish/config.fish
```

**Television**
```sh
ln -s ~/Documents/cookbook/television ~/.config/television
```

## Dev Tools

**GitHub CLI (gh)**
Set up both accounts:
- Personal account
- Work account

**Opencode**
```sh
ln -s ~/Documents/cookbook/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc
ln -s ~/Documents/cookbook/opencode/tui.jsonc ~/.config/opencode/tui.jsonc
ln -s ~/Documents/cookbook/opencode/AGENTS.md ~/.config/opencode/AGENTS.md
ln -s ~/Documents/cookbook/opencode/commands ~/.config/opencode/commands
```

**Neovim (LazyVim)**
```sh
gh repo clone romainmartinez/lazyvim.git ~/.config/nvim
```

**Zed**
```sh
ln -s ~/Documents/cookbook/editors/zed-settings.json ~/.config/zed/settings.json
ln -s ~/Documents/cookbook/editors/zed-keymaps.json ~/.config/zed/keymap.json
```

**VS Code**
```sh
ln -s ~/Documents/cookbook/editors/vscode-settings.json ~/Library/Application\ Support/Code/User/settings.json
ln -s ~/Documents/cookbook/editors/vscode-keybindings.json ~/Library/Application\ Support/Code/User/keybindings.json
```

Install extensions from `editors/vscode-extensions.txt`.

**Yazi**
```sh
gh repo clone romainmartinez/yazi.git ~/.config/yazi
```

## GUI Apps

**Productivity**
- raycast (remove vscode, chrome, edge, zoom defaults)
- cleanshot
- obsidian
- todoist

**Utilities**
- karabiner-elements
  ```sh
  ln -s ~/Documents/cookbook/karabiner.json ~/.config/karabiner/karabiner.json
  ```
- thaw

**Browsers**
- chrome

**Media & design**
- spotify
- figma

**Microsoft**
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
