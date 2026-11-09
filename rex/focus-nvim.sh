#!/bin/sh
# shellcheck disable=SC1010
# Rex.app picks its visible tab itself, so focusing the block on the server isn't enough.
rex focus -s "$REX_SESSION" "$REX_NVIM_BLOCK" &&
	rex do session.select session_id="$REX_SESSION" window_id="$REX_NVIM_WINDOW"
