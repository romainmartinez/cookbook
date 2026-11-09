# ─── PATH ────────────────────────────────────────────────────────────
fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# ─── ENVIRONMENT ─────────────────────────────────────────────────────
set -gx EDITOR nvim
set -gx VISUAL nvim

# code/projects folder (this repo lives at $CODE_FOLDER/cookbook)
set -gx CODE_FOLDER $HOME/Documents

# ─── ALIASES ─────────────────────────────────────────────────────────
alias n='nvim'
alias lg='lazygit'
alias gha='gh auth switch'
alias nr='npm run'

# lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l --blocks date,size,name'

# ─── TOOL INITIALIZATION ─────────────────────────────────────────────
zoxide init fish | source
tv init fish | source

# change working directory when quitting Yazi
function y
    set tmp (mktemp -t "yazi-cwd.XXXXXX")
    command yazi $argv --cwd-file="$tmp"
    if read -z cwd < "$tmp"; and [ "$cwd" != "$PWD" ]; and test -d "$cwd"
        builtin cd -- "$cwd"
    end
    command rm -f -- "$tmp"
end

# ─── KEYBINDINGS ─────────────────────────────────────────────────────
fish_vi_key_bindings

function fish_user_key_bindings
    bind \cc\cc 'commandline ""; clear; commandline -f repaint'
    bind -M insert \cc\cc 'commandline ""; clear; commandline -f repaint'
end

# ─── PROMPT & UI ─────────────────────────────────────────────────────
# remove the default greeting message
set fish_greeting

# name the Rex session after the folder plus git ahead/behind, fetching at most every 5 minutes
if set -q REX_SESSION
    function __rex_session_label --on-event fish_prompt
        set -l label (path basename $PWD)
        if git rev-list --left-right --count 'HEAD...@{upstream}' 2>/dev/null | read -l -d \t ahead behind
            if test (path mtime --relative (git rev-parse --git-path FETCH_HEAD); or echo 300) -ge 300
                GIT_TERMINAL_PROMPT=0 command git fetch --quiet &>/dev/null &
                disown
            end
            set -a label (string match -r '.[1-9]\d*' ↑$ahead ↓$behind)
        end
        set label (string join ' ' $label)
        test "$label" = "$__rex_session_label"; and return
        set -g __rex_session_label $label
        rex session rename $REX_SESSION $label &>/dev/null &
        disown
    end
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
