#!/bin/sh
# </dev/null skips nvim's TUI startup.
nv() { nvim --server "$NVIM" "$@" </dev/null >/dev/null 2>&1; }
nv --remote-tab "$1" || exit
[ -z "$2" ] || nv --remote-send "<C-\\><C-n>:$2<CR>"
"$HOME/.config/rex/focus-nvim.sh" && rex block close -s "$REX_SESSION" "$REX_BLOCK"
