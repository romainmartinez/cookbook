#!/bin/sh
[ -n "$NVIM" ] || exec yazi
# </dev/null skips nvim's TUI startup.
nv() { nvim --server "$NVIM" "$@" </dev/null >/dev/null 2>&1; }
chooser=$(mktemp)
trap 'rm -f "$chooser"' 0 1 2 15
yazi --chooser-file "$chooser"
IFS= read -r picked <"$chooser"
[ -n "$picked" ] || exit
if [ -d "$picked" ]; then
	nv --remote-expr "chdir(readfile('$chooser')[0])"
else
	nv --remote-tab "$picked"
fi && "$HOME/.config/rex/focus-nvim.sh"
