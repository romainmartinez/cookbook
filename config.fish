# ─── PATH ────────────────────────────────────────────────────────────
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin
fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# pnpm
set -gx PNPM_HOME $HOME/Library/pnpm
if not string match -q -- $PNPM_HOME $PATH
    set -gx PATH "$PNPM_HOME" $PATH
end

# ─── ENVIRONMENT ─────────────────────────────────────────────────────
set -gx EDITOR nvim
set -gx VISUAL nvim

# opencode (until supported in its config files)
set -gx OPENCODE_DISABLE_TERMINAL_TITLE 1

set -gx HOMEBREW_NO_UPGRADE_AUTO_UPDATES_CASKS 1

# ─── MANULIFE (proxy + certificates) ─────────────────────────────────
set -l proxy_url "http://127.0.0.1:9000"
set -gx HTTP_PROXY $proxy_url
set -gx HTTPS_PROXY $proxy_url
set -gx NO_PROXY "localhost,127.0.0.1"

set -gx CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.pem
set -gx PIP_CERT $CERT_FILE
set -gx REQUESTS_CA_BUNDLE $CERT_FILE
set -gx SSL_CERT_FILE $CERT_FILE
set -gx NODE_EXTRA_CA_CERTS $CERT_FILE

# ─── ALIASES ─────────────────────────────────────────────────────────
alias n='nvim'
alias oc='opencode'
alias lg='lazygit'
alias gha='gh auth switch'
alias nr='npm run'

# lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l --blocks date,size,name'

# homebrew cleanup
alias brewclean='brew update && yes | brew upgrade && brew autoremove && brew cleanup; brew doctor'

# ─── TOOL INITIALIZATION ─────────────────────────────────────────────
zoxide init fish | source
tv init fish | source

# ─── KEYBINDINGS ─────────────────────────────────────────────────────
fish_vi_key_bindings

function fish_user_key_bindings
    bind \cc\cc 'commandline ""; clear; commandline -f repaint'
    bind -M insert \cc\cc 'commandline ""; clear; commandline -f repaint'
end

# ─── PROMPT & UI ─────────────────────────────────────────────────────
# remove the default greeting message
set fish_greeting

# show the current folder and command in the tab title
function fish_title
    echo (basename $PWD) • (status current-command)
end

# prompt: current working directory + git status
function fish_prompt
    set_color $fish_color_cwd
    echo -n (prompt_pwd)
    if git rev-parse --git-dir &>/dev/null
        if test -n "$(git status --porcelain)"
            set_color yellow
            echo -n ' ●'
        else
            set_color green
            echo -n ' ✓'
        end
    end
    set_color normal
    echo -n ' > '
end

# ─── FUNCTIONS ───────────────────────────────────────────────────────
# change working directory when quitting yazi
function y
    set tmp (mktemp -t "yazi-cwd.XXXXXX")
    yazi $argv --cwd-file="$tmp"
    if read -z cwd <"$tmp"; and [ -n "$cwd" ]; and [ "$cwd" != "$PWD" ]
        builtin cd -- "$cwd"
    end
    rm -f -- "$tmp"
end

# notify when a long-running command finishes
function __notify_done --on-event fish_postexec
    set -l cmd_duration_sec (math $CMD_DURATION / 1000)
    if test $cmd_duration_sec -gt 5
        osascript -e "display notification \"$argv[1]\" with title \"Done in $cmd_duration_sec s\" sound name \"Blow\""
    end
end
