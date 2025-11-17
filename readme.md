# Mac Setup Instructions

## Homebrew

- disable hold menu
  - `defaults write -g ApplePressAndHoldEnabled -bool false`
- [brew](https://brew.sh/)
  - install next softwares with brew
- git credential
  - if ssh is enabled, set ssh key for work and personal github repos
  - if not, install `git-credential-manager`
- install certificate
  - `sudo cp ~/Downloads/manulife-cacert.pem /usr/local/share/ca-certificates/manulife-cacert.perm`
- raycast
  - remove vscode, chrome, edge, zoom
- karabiner-elements
  - `ln -s ~/Documents/cookbook/karabiner.json ~/.config/karabiner/karabiner.json`
- chrome
- zed
  - `ln -s ~/Documents/cookbook/zed-settings.json ~/.config/zed/settings.json`
- vscode
  - `ln -s ~/Documents/cookbook/vscode-settings.json ~/Library/Application\ Support/Code/User/settings.json`
  - `ln -s ~/Documents/cookbook/vscode-keybindings.json ~/Library/Application\ Support/Code/User/keybindings.json`
  - install extensions found in `vscode-extensions.txt`
- font-jetbrains-mono-nerd-font
- cleanshot
- bartender
- obsidian
- todoist
- spotify
- figma
- shortcat
- warp
- uv
- fish
  - fisher
  - fzf
  - lsd
  - zoxide
  - `ln -s ~/Documents/cookbook/config.fish ~/.config/fish/config.fish`
- microsoft office suite (word, excel, powerpoint)
- microsoft teams

## System Settings

- Prefer ethernet over wifi
- Prefer tabs: always
- Hide tags in Finder
- Automatically rearrange spaces based on most recent use: false
- When switching to an application, switch to a Space with open windows for the application: false
- Group windows by application: false
- Displays have separate Spaces: false
