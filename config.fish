if status is-interactive
    # Commands to run in interactive sessions can go here
end

set -x PATH /Users/romainm/.local/bin $PATH
set -x PATH /Users/romainm/.cargo/bin/ $PATH
set -x PIP_CERT /usr/local/share/ca-certificates/manulife-cacert.perm
set -x REQUESTS_CA_BUNDLE /usr/local/share/ca-certificates/manulife-cacert.perm
set -x SSL_CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.perm
set -x NODE_TLS_REJECT_UNAUTHORIZED 0

# set alias for exa
alias ls='lsd'
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'

direnv hook fish | source
# `z` and `zi`
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
