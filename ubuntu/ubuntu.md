- ubuntu minimal installation
- Delete firefox [link](https://askubuntu.com/questions/16758/removing-firefox-in-ubuntu-with-all-add-ons-like-it-never-existed)
- Clear dirs:
```bash
rm -rf ~/Templates ~/Public ~/Music ~/Videos 
mkdir ~/codes
```
- comments Templates, Public, Music, Videos in `~/.config/user-dirs.dirs` __and__ `/etc/xdg/user-dirs.defaults`
- [wallpaper](https://imgur.com/a/nwrAFSJ)

# From Snap
- spotify
- inkscape

## Optional
- okular (set default from a pdf)
- gitkraken
- pycharm pro

# From Google
- dropbox
- stacer: `sudo apt install stacer`
- antidote
- [powerline-fonts](https://github.com/powerline/fonts)
- [JetBrainsMono](https://www.jetbrains.com/lp/mono/)
- zsh (`sudo apt install zsh`)
- [oh-my-zsh](https://github.com/ohmyzsh/ohmyzsh)
- [spaceship zsh theme](https://github.com/denysdovhan/spaceship-prompt)
- [nord theme for gnome terminal](https://github.com/arcticicestudio/nord-gnome-terminal): set in terminal + Jetbrains Mono + font size @ 13pt
- ranger
- miniconda (see cookbook/python/MakeFile)
- spacemacs

```bash
git clone git@github.com:romainmartinez/cookbook.git
cd cookbook/ubuntu
cp .spacemacs ~/.spacemacs
cp .zshrc ~/.zshrc
```
