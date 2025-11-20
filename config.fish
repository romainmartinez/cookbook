# homebrew
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin

fish_add_path $HOME/.local/bin
fish_add_path $HOME/.cargo/bin

alias brewclean='brew update && brew upgrade && brew cleanup && brew autoremove && brew doctor'

# Set certificate-related environment variables
set -x CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.perm
set -x PIP_CERT $CERT_FILE
set -x REQUESTS_CA_BUNDLE $CERT_FILE
set -x SSL_CERT_FILE $CERT_FILE
set -x NODE_EXTRA_CA_CERTS $CERT_FILE

# Set aliases for lsd (modern ls replacement)
alias ls='lsd'
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'

# Set aliases for fzf (fuzzy finder)
alias fk='ps -ef | fzf --header-lines=1 --multi --exact | awk "{print \$2}" | xargs kill -9'
alias fh='eval (history | fzf --tac | sed "s/ *[0-9]* *//")'
alias ff='find $HOME \( -type d -name ".git" -prune \) -o \( -type d -o -type f \) -print 2>/dev/null | fzf --exact'
alias fcd='cd (find $HOME \( -type d -name ".git" -prune \) -o -type d -print 2>/dev/null | fzf --exact)'

# Initialize zoxide for `z` and `zi` commands
zoxide init fish | source

fish_vi_key_bindings
