#!/bin/sh

set -eu

PATH="${REX_BIN_DIR:+$REX_BIN_DIR:}$PATH"

wait_for_close() {
  printf 'Press Enter to close...' >&2
  read -r _
}

for dependency in fzf rex; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    printf 'Missing dependency: %s\n' "$dependency" >&2
    wait_for_close
    exit 1
  fi
done

list="rex do '$(dirname "$0")/tab-list.lua'"

tab=$(printf '\t')
selection=$(
  sh -c "$list" | fzf \
    --ansi \
    --with-shell='sh -c' \
    --delimiter="$tab" \
    --with-nth=1 \
    --layout=reverse \
    --border=none \
    --info=hidden \
    --prompt='Tabs › ' \
    --header='enter: switch · ctrl-x: close tab' \
    --preview='rex capture -s {2} -b {4} --trim --format=vt | tail -n "$FZF_PREVIEW_LINES" | tr -d "\r"' \
    --preview-window='down,65%,border-top' \
    --bind="ctrl-x:execute-silent(rex window close -s {2} {3})+reload($list)"
) || exit 0

[ -n "$selection" ] || exit 0
ids=${selection#*"$tab"}
session_id=${ids%%"$tab"*}
ids=${ids#*"$tab"}
window_id=${ids%%"$tab"*}
if ! rex do session.select session_id="$session_id" window_id="$window_id" >/dev/null; then
  wait_for_close
  exit 1
fi
