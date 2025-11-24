# homebrew
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin

fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

# manulife http proxy settings
set -gx HTTP_PROXY "http://127.0.0.1:9000"
set -gx HTTPS_PROXY "http://127.0.0.1:9000"
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
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'

# homebrew cleanup alias
alias brewclean='brew update && brew upgrade && brew cleanup && brew autoremove && brew doctor'

# Set aliases for fzf (fuzzy finder)
alias fk='ps -ef | fzf --header-lines=1 --multi --exact | awk "{print \$2}" | xargs kill -9'
alias fh='eval (history | fzf --tac | sed "s/ *[0-9]* *//")'
alias ff='find $HOME \( -type d -name ".git" -prune \) -o \( -type d -o -type f \) -print 2>/dev/null | fzf --exact'
alias fcd='cd (find $HOME \( -type d -name ".git" -prune \) -o -type d -print 2>/dev/null | fzf --exact)'

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

# remove the default greeting message
set fish_greeting

# edit the fish prompt to show only the current working directory
function fish_prompt
    set_color $fish_color_cwd
    echo -n (prompt_pwd)
    set_color normal
    echo -n ' > '
end
