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

  herdr api snapshot | jq -r '
    .result.snapshot as $snapshot
    | ($snapshot.workspaces | map(.label | length) | max // 0) as $project_width
    | $snapshot.tabs[] as $tab
    | ($snapshot.workspaces[] | select(.workspace_id == $tab.workspace_id)) as $workspace
    | ([$snapshot.tabs[] | select(.workspace_id == $tab.workspace_id) | .tab_id]
       | index($tab.tab_id) + 1) as $tab_number
    | (if $tab.agent_status == "blocked" then "\u001b[31m×\u001b[0m"
       elif $tab.agent_status == "working" then "\u001b[33m◐\u001b[0m"
       elif $tab.agent_status == "done" then "\u001b[32m✓\u001b[0m"
       elif $tab.agent_status == "idle" then "\u001b[2m○\u001b[0m"
       else " "
       end) as $status
    | [
        ("\u001b[36m" + $workspace.label
         + (" " * ($project_width - ($workspace.label | length))) + "\u001b[0m"
         + "  \u001b[2m" + ($tab_number | tostring) + "\u001b[0m "
         + $tab.label + "  " + $status),
        ("\u001b[2m" + $tab.tab_id + "\u001b[0m")
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

selection=$(tv herdr-tabs --tick-rate 120 --no-preview --no-remote --no-status-bar --no-help-panel) || exit 0
[ -n "$selection" ] || exit 0
herdr tab focus "$selection"
