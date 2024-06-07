if status is-interactive
    # Commands to run in interactive sessions can go here
end

set -x PATH /Users/romainm/.local/bin $PATH
set -x PATH /Users/romainm/.cargo/bin/ $PATH

# set alias for exa
alias ls='lsd'
alias l='ls -l'
alias la='ls -a'
alias lla='ls -la'
alias lt='ls --tree'
