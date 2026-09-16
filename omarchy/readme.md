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

```sh
echo 'rom ALL=(ALL:ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/rom-nopasswd >/dev/null
sudo chmod 440 /etc/sudoers.d/rom-nopasswd
sudo visudo -cf /etc/sudoers.d/rom-nopasswd
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
omarchy pkg add fish television lsd yazi fd bat jq uv keyd tailscale mosh git-delta github-cli tuicr
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
- herdr: expose the mise shim before using the shared setup commands
  ```sh
  mkdir -p ~/.local/bin
  ln -sfn ~/.local/share/mise/shims/herdr ~/.local/bin/herdr
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

Tailscale SSH hijacks port 22, ignores `authorized_keys`, and breaks mosh
(~60s hang then auth error). Use plain OpenSSH.

```sh
sudo systemctl enable --now tailscaled
sudo tailscale up --accept-routes
sudo tailscale set --operator="$USER" --ssh=false
```

### SSH + mosh (tailnet only)

```sh
sudo systemctl enable --now sshd
sudo ln -sfn $CODE_FOLDER/cookbook/omarchy/sshd/10-key-only.conf /etc/ssh/sshd_config.d/10-key-only.conf
sudo sshd -t && sudo systemctl reload sshd
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
ln -sfn $CODE_FOLDER/cookbook/omarchy/systemd/herdr.service ~/.config/systemd/user/herdr.service
systemctl --user disable --now herdr.service
systemctl --user daemon-reload
systemctl --user enable --now herdr.service
```

### moshi + moshi-hook

```sh
curl -fsSL https://getmoshi.app/install.sh | sh   # -> ~/.local/bin
moshi-hook update
```

Two pairings, both need the iPhone Moshi app on the tailnet:

SSH/Mosh terminal pairing:
```sh
moshi-hook host setup --host omarchy-1 --name "Dell XPS"
# scan QR from iPhone Moshi app
```

Agent-hook pairing (workspace switcher, inbox, approvals):
```sh
# Get token from iPhone Moshi app: Settings -> Hooks
moshi-hook pair --token <token>
moshi-hook install           # writes hooks into supported agents
moshi-hook service install   # user systemd unit, auto-start
systemctl --user restart moshi-hook.service
moshi-hook probe             # running and gateway should both be true
```

Restart agent sessions that were already open when hooks were installed or
updated; agents load hook integrations at startup.

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
