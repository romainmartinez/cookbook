#!/bin/sh
# </dev/null skips nvim's TUI startup.
nv() { nvim --server "$NVIM" "$@" </dev/null >/dev/null 2>&1; }
nv --remote-tab "$1" || exit
[ -z "$2" ] || nv --remote-send "<C-\\><C-n>:$2<CR>"
rex do -s "$REX_SESSION" jump_to block_id="$REX_NVIM_BLOCK" && rex block close -s "$REX_SESSION" "$REX_BLOCK"
