# Mac Setup Instructions

> [!NOTE]
> Why not an automated script?
>
> Because setting up a new Mac is a great opportunity to review and
> reconsider which applications and settings you actually want to use.

## System Preferences

- disable hold menu
  - `defaults write -g ApplePressAndHoldEnabled -bool false`
- install certificate
  - `sudo cp ~/Downloads/manulife-cacert.pem /usr/local/share/ca-certificates/manulife-cacert.perm`

- Prefer ethernet over wifi
- Prefer tabs: always
- Hide tags in Finder
- Automatically rearrange spaces based on most recent use: false
- Switch to a Space with open windows for the application: false
- Group windows by application: false
- Displays have separate Spaces: false

## Homebrew

- [brew](https://brew.sh/)
  - install next softwares with brew

- github `gh`
  - personal account
  - work account

- raycast
  - remove vscode, chrome, edge, zoom

- karabiner-elements
  - `ln -s ~/Documents/cookbook/karabiner.json ~/.config/karabiner/karabiner.json`

- chrome

- ghostty
  - `ln -s ~/Documents/cookbook/ghostty.config ~/.config/ghostty/config`
  - fish
    - fisher
    - `ln -s ~/Documents/cookbook/config.fish ~/.config/fish/config.fish`
  - font-jetbrains-mono-nerd-font
  - font-zed-mono-nerd-font
  - fzf
  - lsd
  - zoxide
  - zed nerd font or jetbrains mono nerd font
  - lazygit
  - curl
  - ripgrep
  - fd
  - yazi
    - show hidden files
    - tokyo-night theme
  - uv
  - opencode
    - `ln -s ~/Documents/cookbook/opencode.jsonc ~/.config/opencode/opencode.jsonc`
  - nvim
    - `gh clone romainmartinez/lazyvim.git ~/.config/nvim`

- zed
  - `ln -s ~/Documents/cookbook/zed-settings.json ~/.config/zed/settings.json`
  - `ln -s ~/Documents/cookbook/zed-keymaps.json ~/.config/zed/keymap.json`

- vscode
  - `ln -s ~/Documents/cookbook/vscode-settings.json ~/Library/Application\ Support/Code/User/settings.json`
  - `ln -s ~/Documents/cookbook/vscode-keybindings.json ~/Library/Application\ Support/Code/User/keybindings.json`
  - install extensions found in `vscode-extensions.txt`

- cleanshot
- bartender
- obsidian
- todoist
- spotify
- figma

- microsoft office suite (word, excel, powerpoint)
- microsoft teams
