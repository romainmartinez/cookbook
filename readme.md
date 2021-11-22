# Linux

- Download [regolith-linux](https://regolith-linux.org/) or Ubuntu minimal installation

```bash
ln -s /home/romain/code/cookbook/config /home/romain/.config/regolith/i3/config
```

- If one screen has weird colors:
  1. identify which screen with `xrandr`
  2. `echo "xrandr --output <SCREEN FROM STEP 1> --set "Broadcast RGB" "Full"" > ~/.xprofile`

## Removing useless stuff

- Delete firefox [link](https://askubuntu.com/questions/16758/removing-firefox-in-ubuntu-with-all-add-ons-like-it-never-existed)
- comments Templates, Public, Music, Videos in `~/.config/user-dirs.dirs` **and** `/etc/xdg/user-dirs.defaults`
- Clear dirs:

```bash
rm -rf ~/Templates ~/Public ~/Music ~/Videos
```

## Misc

- Switch caps lock and esc:

```bash
gsettings set org.gnome.desktop.input-sources xkb-options "['caps:swapescape']"
```

```bash
# in ~/.xession
setxkbmap -option caps:swapescape
```

# Bash setup

- [powerline-fonts](https://github.com/powerline/fonts): JetBrains Mono
- [nord theme for gnome terminal](https://github.com/arcticicestudio/nord-gnome-terminal): set in terminal + Jetbrains Mono + font size @ 13pt
- fzf

## fish

- `sudo apt install fish`
- install [starship](https://github.com/starship/starship)
- default to fish: [link](https://fishshell.com/docs/current/tutorial.html#switching-to-fish)
- [fisher](https://github.com/jorgebucaran/fisher)
- [fish-fzf](https://github.com/PatrickF1/fzf.fish)

```bash
ln -s /home/romain/code/cookbook/config.fish ~/.config/fish/config.fish
```

# Softwares

- [spotify](https://www.spotify.com/ca-en/download/linux/)
- [inkscape](https://inkscape.org/)
- vscode with Sync
- dropbox
- stacer
- antidote
- miniconda (see MakeFile)
- Teams
- DeepL

Mac Specific

- alfred (with powerpack): sync with Dropbox/pro/alfred
- karabiner
  - disable arrow keys
  - CAPS_LOCK to Hyper/Escape (SHIFT+COMMAND+OPTION+CONTROL) & Hyper + VIM Navigation keys
- yabai
- skhd

```bash
ln -s ~/Documents/cookbook/.skhd ~/.skhd
ln -s ~/Documents/cookbook/.yabairc ~/.yabairc
chmod +x ~/.yabairc
```

TODO:

- launch chrome, terminal
- tinker yabai config
- see vspacecode window menu and copy into skhd
