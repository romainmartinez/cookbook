# ─── PATH ────────────────────────────────────────────────────────────
fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# ─── ENVIRONMENT ─────────────────────────────────────────────────────
set -gx EDITOR nvim
set -gx VISUAL nvim

# opencode (until supported in its config files)
set -gx OPENCODE_DISABLE_TERMINAL_TITLE 1

# ─── ALIASES ─────────────────────────────────────────────────────────
alias n='nvim'
alias oc='opencode'
alias lg='lazygit'
alias gha='gh auth switch'
alias nr='npm run'

# lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l --blocks date,size,name'

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
        if git diff-index --quiet HEAD -- 2>/dev/null
            and test -z (git ls-files --others --exclude-standard | string collect)
            set_color green
            echo -n ' ✓'
        else
            set_color yellow
            echo -n ' ●'
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

