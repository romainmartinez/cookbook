# Mac Setup Instructions

## Settings

- Prefer ethernet over wifi
- Prefer tabs: always
- Hide tags in Finder
- Automatically rearrange spaces based on most recent use: false
- When switching to an application, switch to a Space with open windows for the application: false
- Group windows by application: false
- Displays have separate Spaces: false

## Softwares

- Office suite (word, excel, powerpoint)
- Teams
- Acrobat Reader

## Homebrew

- raycast
- arc
  - ⌘+J/K for up/down
  - ⌘+L/H for previous/next)
- warp
  - [powerline-fonts](https://github.com/powerline/fonts): JetBrains Mono with brew
  - [catpuccin theme](https://github.com/catppuccin/warp)
  - fish
  ```bash
  ln -s ~/Documents/cookbook/config.fish ~/.config/fish/config.fish
  ln -s ~/Documents/cookbook/auto_conda_activate.fish ~/.config/fish/functions/auto_conda_activate.fish
  ```
  - fisher
  - fzf
  - zoxide
  - exa
- cleanmymac
  - clean useless mac apps
- karabiner

```bash
ln -s ~/Documents/cookbook/karabiner.json ~/.config/karabiner/karabiner.json
```

- dropbox
- notion + notion calendar
- notion-calendar
- spotify
- vscode
- miniconda
- hiddenbar
- cleanshot X

- nvim

```bash
git clone git@github.com:romainmartinez/lazyvim.git ~/.config/nvim
```
