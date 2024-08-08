# Set user-specific paths
set -x PATH $HOME/.local/bin $PATH
set -x PATH $HOME/.cargo/bin $PATH

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

# Initialize direnv
direnv hook fish | source

# Initialize zoxide for `z` and `zi` commands
zoxide init fish | source

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
if test -f /opt/homebrew/Caskroom/miniconda/base/bin/conda
    eval /opt/homebrew/Caskroom/miniconda/base/bin/conda "shell.fish" hook $argv | source
else
    if test -f "/opt/homebrew/Caskroom/miniconda/base/etc/fish/conf.d/conda.fish"
        . "/opt/homebrew/Caskroom/miniconda/base/etc/fish/conf.d/conda.fish"
    else
        set -x PATH /opt/homebrew/Caskroom/miniconda/base/bin $PATH
    end
end
# <<< conda initialize <<<
