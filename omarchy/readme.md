# Omarchy Setup

Linux companion to the root `readme.md`, tested with Omarchy 4.x.
Follow the shared instructions in the root readme unless this file overrides
them with Linux-specific packages, paths, or configuration.

## Ground rules

- Only track files that differ from Omarchy defaults. Compare against
  `/usr/share/omarchy/config/` and `/usr/share/omarchy/default/` first.
- Never edit `/usr/share/omarchy/`; pacman owns it. User configuration belongs
  under `~/.config/`.
- Prefer the `omarchy` CLI over its underlying `omarchy-*` binaries.

## Sudo

Keep the default password requirement. Remove the legacy unrestricted rule if it was installed by an older version of this guide:

```sh
sudo rm -f /etc/sudoers.d/rom-nopasswd
sudo visudo -c
```

## Keyboard

- hypr (replaces the karabiner setup from the root)
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/input.lua ~/.config/hypr/input.lua
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/bindings.lua ~/.config/hypr/bindings.lua
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/looknfeel.lua ~/.config/hypr/looknfeel.lua
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/autostart.lua ~/.config/hypr/autostart.lua
  hyprctl reload && hyprctl configerrors
  ```
- keyd (remaps; install with `omarchy pkg add keyd` first)
  ```sh
  sudo ln -sfn $CODE_FOLDER/cookbook/omarchy/keyd/default.conf /etc/keyd/default.conf
  sudo systemctl enable --now keyd
  ```

## Packages

```sh
omarchy pkg add fish television lsd yazi fd bat jq uv keyd tailscale git-delta github-cli tuicr
omarchy install terminal ghostty
```

## Setup overrides

Linux application configs live under `~/.config`. Use the shared setup commands
in the root readme for tools not listed here.

- fish
  ```sh
  mkdir -p ~/.config/fish
  ln -sfn $CODE_FOLDER/cookbook/fish/linux.fish ~/.config/fish/config.fish
  chsh -s /usr/bin/fish
  ```

- ghostty
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/ghostty/linux.config ~/.config/ghostty/config
  ```
- lazygit
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/lazygit/config.yml ~/.config/lazygit/config.yml
  ```
- opencode: remove Omarchy's conflicting default files before using the shared
  symlink commands
  ```sh
  rm -f ~/.config/opencode/opencode.json ~/.config/opencode/tui.json
  ```

## Server mode

Turns this box into the always-on remote dev server.

### Prevent sleep

```sh
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/99-server.conf >/dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
EOF
sudo systemctl restart systemd-logind
```

### Tailscale (no Tailscale SSH)

Tailscale SSH hijacks port 22 and ignores `authorized_keys`. Use plain OpenSSH.

```sh
sudo systemctl enable --now tailscaled
sudo tailscale up --accept-routes
sudo tailscale set --operator="$USER" --ssh=false
```

### SSH (tailnet only)

```sh
sudo systemctl enable --now sshd
sudo ln -sfn $CODE_FOLDER/cookbook/omarchy/sshd/10-key-only.conf /etc/ssh/sshd_config.d/10-key-only.conf
sudo sshd -t && sudo systemctl reload sshd
sudo ufw allow in on tailscale0 to any port 22 proto tcp comment 'ssh over tailnet'
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

### Rex server

Server only (no Linux client). Joins the tailnet as `omarchy-rex` via built-in Tailscale, independent of system tailscaled. Requires tailnet MagicDNS and HTTPS certs.

```sh
curl -fsSL https://pkgs.superlogical.com/rex/install.sh | sh
mkdir -p ~/.config/systemd/user/rex.service.d
ln -sfn $CODE_FOLDER/cookbook/omarchy/systemd/rex.service.d/tailscale.conf ~/.config/systemd/user/rex.service.d/tailscale.conf
systemctl --user daemon-reload
systemctl --user enable --now rex.service
loginctl enable-linger
rex server status          # open Tailscale auth link once
rex server tailscale pair  # scan with Rex iOS app
```

`omarchy refresh pacman` and `omarchy channel set` drop the Rex repo; rerun the install script after them.

### Strava to Intervals.icu sync

Create a Strava API app at <https://www.strava.com/settings/api> with callback domain `localhost`, then:

```sh
sudo loginctl enable-linger "$USER"
$CODE_FOLDER/cookbook/scripts/strava-intervals.py --install-timer
```

### Obsidian + Sync

Launch Obsidian once, sign in, Settings -> Sync -> pick remote vault. Sync
runs inside the Obsidian process; keep the app running.

Then, turn vault as git repo:
```sh
git remote add origin https://github.com/romainmartinez/brain.git
git fetch origin
git reset origin/main
```

Gotcha: Obsidian Sync excludes dotfiles and non-markdown by default. After
`git reset origin/main` the diff will show `.gitignore`, `.obsidian.vimrc`,
plugin files, and `.typ`/`.py`/`.csv`/`.html` as "deleted" locally. Restore
from git, then enable "Sync all other file types" in Obsidian Sync settings.
