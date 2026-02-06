# homebrew
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin

fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# manulife http proxy settings
set -gx HTTP_PROXY "http://127.0.0.1:9000"
set -gx NO_PROXY "localhost,127.0.0.1"

# manulife certificate-related environment variables
set -x CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.perm
set -x PIP_CERT $CERT_FILE
set -x REQUESTS_CA_BUNDLE $CERT_FILE
set -x SSL_CERT_FILE $CERT_FILE
set -x NODE_EXTRA_CA_CERTS $CERT_FILE

alias n='nvim'
set -gx EDITOR nvim
set -gx VISUAL nvim

# Set aliases for lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l --blocks date,size,name'

# homebrew cleanup alias
alias brewclean='brew update && brew upgrade && brew cleanup && brew autoremove && brew doctor'

# Set aliases for fzf
#    search directory → <ctrl>-f
#    search git logs → <ctrl>-l
#    search git status → <ctrl>-s
#    search processes → <ctrl>-p
fzf_configure_bindings --directory=\cf --git_log=\cl --git_status=\cs --processes=\cp

# Initialize zoxide for `z` and `zi` commands
zoxide init fish | source

# add vim
fish_vi_key_bindings

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

# show only the command in the tab title (not the path)
function fish_title
    echo (status current-command)
end

# edit the fish prompt to show only the current working directory
function fish_prompt
    set_color $fish_color_cwd
    echo -n (prompt_pwd)
    set_color normal
    echo -n ' > '
end

# pnpm
set -gx PNPM_HOME /Users/martrom/Library/pnpm
if not string match -q -- $PNPM_HOME $PATH
    set -gx PATH "$PNPM_HOME" $PATH
end
# pnpm end
