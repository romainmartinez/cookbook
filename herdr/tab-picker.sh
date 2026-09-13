#!/bin/sh

set -eu

wait_for_close() {
  printf 'Press Enter to close...' >&2
  read -r _
}

if [ "${1:-}" = "--list" ]; then
  for dependency in herdr jq; do
    if ! command -v "$dependency" >/dev/null 2>&1; then
      printf 'Missing dependency: %s\n' "$dependency" >&2
      exit 1
    fi
  done

  herdr api snapshot | jq -r --arg home "$HOME" '
    .result.snapshot as $snapshot
    | $snapshot.tabs[] as $tab
    | ($snapshot.workspaces[] | select(.workspace_id == $tab.workspace_id)) as $workspace
    | ([
        $snapshot.panes[]
        | select(.tab_id == $tab.tab_id)
      ] | sort_by(if .focused then 0 else 1 end) | .[0]) as $pane
    | (($pane.foreground_cwd // $pane.cwd // "") as $cwd
      | if $cwd == $home then "~"
        elif $cwd | startswith($home + "/") then "~" + $cwd[($home | length):]
        else $cwd
        end) as $cwd
    | [
        $tab.tab_id,
        ($workspace.label + "  ›  " + $tab.label),
        $cwd
      ]
    | @tsv
  '
  exit 0
fi

if ! command -v tv >/dev/null 2>&1; then
  printf 'Missing dependency: television\n' >&2
  wait_for_close
  exit 1
fi

selection=$(tv herdr-tabs --no-preview --no-remote --no-status-bar --no-help-panel) || exit 0
[ -n "$selection" ] || exit 0
herdr tab focus "$selection"
