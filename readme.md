# Removing useless stuff

- Download [regolith-linux](https://regolith-linux.org/)

```bash
ln -s /home/romain/code/cookbook/config /home/romain/.config/regolith/i3/config
```

- Ubuntu minimal installation

- Delete firefox [link](https://askubuntu.com/questions/16758/removing-firefox-in-ubuntu-with-all-add-ons-like-it-never-existed)

- Clear dirs:

```bash
rm -rf ~/Templates ~/Public ~/Music ~/Videos
```

- comments Templates, Public, Music, Videos in `~/.config/user-dirs.dirs` **and** `/etc/xdg/user-dirs.defaults`

# Misc

- Switch caps lock and esc:

```bash
gsettings set org.gnome.desktop.input-sources xkb-options "['caps:swapescape']"
```

```bash
# in ~/.xession
setxkbmap -option caps:swapescape
```

# Bash setup

- [powerline-fonts](https://github.com/powerline/fonts)
- [Fira-code](https://github.com/tonsky/FiraCode/wiki/Linux-instructions#installing-with-a-package-manager)
- [nord theme for gnome terminal](https://github.com/arcticicestudio/nord-gnome-terminal): set in terminal + Jetbrains Mono + font size @ 13pt
- ranger, autojump, fzf

## If fish

- `sudo apt install fish`
- install [starship](https://github.com/starship/starship)
- default to fish: [link](https://fishshell.com/docs/current/tutorial.html#switching-to-fish)
- [fisher](https://github.com/jorgebucaran/fisher)
- [fish-fzf](https://github.com/PatrickF1/fzf.fish)

```bash
ln -s /home/romain/code/cookbook/config.fish ~/.config/fish/config.fish
```

## If zsh

- zsh (`sudo apt install zsh`)
- [oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh)
- [spaceship zsh theme](https://github.com/denysdovhan/spaceship-prompt)

```bash
ln -s /home/romain/code/cookbook/.zshrc /home/romain/.zshrc
```

# From Google

- [spotify](https://www.spotify.com/ca-en/download/linux/)
- [inkscape](https://inkscape.org/)
- vscode
- dropbox
- stacer
- antidote
- miniconda (see MakeFile)
- Teams
- Zoom
