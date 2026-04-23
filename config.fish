# homebrew
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin

fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# manulife http proxy settings
set -l proxy_url "http://127.0.0.1:9000"
set -gx HTTP_PROXY $proxy_url
set -gx HTTPS_PROXY $proxy_url
set -gx NO_PROXY "localhost,127.0.0.1"

# manulife certificate-related environment variables
set -x CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.pem
set -x PIP_CERT $CERT_FILE
set -x REQUESTS_CA_BUNDLE $CERT_FILE
set -x SSL_CERT_FILE $CERT_FILE
set -x NODE_EXTRA_CA_CERTS $CERT_FILE

alias n='nvim'
set -gx EDITOR nvim
set -gx VISUAL nvim

alias oc="opencode"
# while it is not available in opencode's config files
set -gx OPENCODE_DISABLE_TERMINAL_TITLE 1

# Set aliases for lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l --blocks date,size,name'

# homebrew cleanup alias
alias brewclean='brew update && brew upgrade && brew cleanup && brew autoremove && brew doctor'

# Initialize zoxide for `z` and `zi` commands
zoxide init fish | source

# init television
tv init fish | source

# add vim keybindings
fish_vi_key_bindings

function fish_user_key_bindings
    bind \cc\cc 'commandline ""; clear; commandline -f repaint'
    bind -M insert \cc\cc 'commandline ""; clear; commandline -f repaint'
end

# change working directory when quitting yazi
function y
    set tmp (mktemp -t "yazi-cwd.XXXXXX")
    yazi $argv --cwd-file="$tmp"
    if read -z cwd <"$tmp"; and [ -n "$cwd" ]; and [ "$cwd" != "$PWD" ]
        builtin cd -- "$cwd"
    end
    rm -f -- "$tmp"
end

# show notification when done
function __notify_done --on-event fish_postexec
    set -l cmd_duration_sec (math $CMD_DURATION / 1000)
    if test $cmd_duration_sec -gt 5
        osascript -e "display notification \"$argv[1]\" with title \"Done in $cmd_duration_sec s\" sound name \"Blow\""
    end
end

# remove the default greeting message
set fish_greeting

# show the current folder and command in the tab title
function fish_title
    echo (basename $PWD) • (status current-command)
end

# edit the fish prompt to show only the current working directory
# we also display the git status
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

# pnpm
set -gx PNPM_HOME $HOME/Library/pnpm
if not string match -q -- $PNPM_HOME $PATH
    set -gx PATH "$PNPM_HOME" $PATH
end
# pnpm end
