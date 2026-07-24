# Omarchy Setup

Linux (Arch/omarchy) companion to the root `readme.md`.
Follow the root readme top to bottom;
use this file for the Linux-specific bits it doesn't cover.

## Ground rules

- Only track files in this repo that differ from Omarchy defaults. Before
  adding anything to git, `diff` against `~/.local/share/omarchy/config/`.
- Never track files under `~/.config/omarchy/` — pacman-managed, gets
  overwritten on update.

## Sudo

```sh
echo 'rom ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/rom-nopasswd
sudo chmod 440 /etc/sudoers.d/rom-nopasswd
```

## Keyboard

- hypr (replaces the karabiner setup from the root)
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/input.conf ~/.config/hypr/input.conf
  ln -sfn $CODE_FOLDER/cookbook/omarchy/hypr/bindings.conf ~/.config/hypr/bindings.conf
  ```
- keyd (remaps; install the `keyd` package first)
  ```sh
  sudo ln -sfn $CODE_FOLDER/cookbook/omarchy/keyd/default.conf /etc/keyd/default.conf
  sudo systemctl enable --now keyd
  ```

## Setup

The root readme some symlinks configs into macOS `~/Library/Application Support`.
On Linux they live under `~/.config`.

- ghostty
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/ghostty/linux.config ~/.config/ghostty/config
  ```
- superfile
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/superfile/config.toml ~/.config/superfile/config.toml
  ```
- lazygit
  ```sh
  ln -sfn $CODE_FOLDER/cookbook/lazygit/config.yml ~/.config/lazygit/config.yml
  ```
- elephant-all (walker provider, no config)
- custom scripts
  ```sh
  mkdir -p ~/.local/bin
  ln -sfn $CODE_FOLDER/cookbook/omarchy/bin/omarchy-menu-keybindings-run ~/.local/bin/omarchy-menu-keybindings-run
  ```

## Server mode

Turns this box into the always-on remote dev server.
Install first: `tailscale`, `mosh`, `herdr-bin`.

### Prevent sleep

```sh
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

Tailscale SSH hijacks port 22, ignores `authorized_keys`, and breaks mosh
(~60s hang then auth error). Use plain OpenSSH.

```sh
sudo tailscale set --ssh=false
```

### SSH + mosh (tailnet only)

```sh
sudo systemctl enable --now sshd
sudo ufw allow in on tailscale0 to any port 22 proto tcp comment 'ssh over tailnet'
sudo ufw allow in on tailscale0 to any port 60000:61000 proto udp comment 'mosh over tailnet'
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

`moshi-hook host setup` (below) appends the phone's pubkey to
`authorized_keys` during QR pairing.

### herdr as always-on server

```sh
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/herdr.service <<'EOF'
[Unit]
Description=Herdr headless server
After=default.target

[Service]
Type=simple
ExecStart=/usr/bin/herdr server
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now herdr.service
sudo loginctl enable-linger rom   # start at boot without login
```

### moshi + moshi-hook

```sh
curl -fsSL https://getmoshi.app/install.sh | sh   # -> ~/.local/bin
```

Two pairings, both need the iPhone Moshi app on the tailnet:

SSH/Mosh terminal pairing:
```sh
moshi-hook host setup --host omarchy --name "Dell XPS"
# scan QR from iPhone Moshi app
```

Agent-hook pairing (workspace switcher, inbox, approvals):
```sh
# Get token from iPhone Moshi app: Settings -> Hooks
moshi-hook pair --token <token>
moshi-hook install           # writes hooks into opencode, claude, codex
moshi-hook service install   # user systemd unit, auto-start
```

### Obsidian + Sync

```sh
cat >> ~/.config/hypr/autostart.conf <<'EOF'

# Obsidian: keeps Sync running whenever a graphical session is up
exec-once = uwsm-app -- obsidian --enable-wayland-ime --ozone-platform=wayland
EOF
```

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
