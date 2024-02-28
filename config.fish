if status is-interactive
    # Commands to run in interactive sessions can go here
end

# starship prompt
starship init fish | source

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
eval /Users/romainm/miniconda/bin/conda "shell.fish" hook $argv | source
# <<< conda initialize <<<

# Rose Pine
fish_config theme choose "Rosé Pine Moon"
set -Ux FZF_DEFAULT_OPTS "
	--color=fg:#908caa,bg:#232136,hl:#ea9a97
	--color=fg+:#e0def4,bg+:#393552,hl+:#ea9a97
	--color=border:#44415a,header:#3e8fb0,gutter:#232136
	--color=spinner:#f6c177,info:#9ccfd8,separator:#44415a
	--color=pointer:#c4a7e7,marker:#eb6f92,prompt:#908caa"

set -x PATH /Users/romainm/.local/bin $PATH
set -x PATH /Users/romainm/.cargo/bin/ $PATH

# set alias for exa
alias ls='exa --tree --long --header --group --git --icons --color-scale --color=always --time-style=long-iso --git-ignore --git --all --group-directories-first --sort=modified'
