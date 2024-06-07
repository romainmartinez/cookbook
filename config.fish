if status is-interactive
    # Commands to run in interactive sessions can go here
end

set -x PATH /Users/romainm/.local/bin $PATH
set -x PATH /Users/romainm/.cargo/bin/ $PATH

# set alias for exa
alias ls='exa --long --header --group --git --icons --color-scale --color=always --time-style=long-iso --git-ignore --git --all --group-directories-first --sort=modified'
