#!/bin/sh

workspace_id=${1:-$HERDR_WORKSPACE_ID}

for socket in "$HOME/.cache/herdr-nvim/$workspace_id-"*.sock; do
  [ -S "$socket" ] || continue
  perl -MTime::HiRes=alarm -e 'alarm shift; exec @ARGV' 0.5 \
    nvim --server "$socket" --remote-expr 1 </dev/null >/dev/null 2>&1 || continue

  name=${socket##*/}
  pane_id="$workspace_id:${name#"$workspace_id-"}"
  pane_id=${pane_id%.sock}
  tab_id=$(herdr pane get "$pane_id" 2>/dev/null | jq -r '.result.pane.tab_id // empty')
  [ -n "$tab_id" ] || continue

  printf '%s|%s\n' "$socket" "$tab_id"
  exit 0
done
