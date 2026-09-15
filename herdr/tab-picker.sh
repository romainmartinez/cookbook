#!/bin/sh

set -eu

wait_for_close() {
  printf 'Press Enter to close...' >&2
  read -r _
}

list_tabs() {
  activity_dir="${XDG_STATE_HOME:-$HOME/.local/state}/herdr-tab-activity"
  last_focused=$(
    for path in "$activity_dir"/*; do
      [ -f "$path" ] || continue
      IFS= read -r timestamp < "$path"
      printf '%s\t%s\n' "${path##*/}" "$timestamp"
    done | jq -Rsc '
      split("\n")
      | map(select(length > 0) | split("\t") | {(.[0]): .[1]})
      | add // {}
    '
  )

  herdr api snapshot | jq -r --argjson last_focused "$last_focused" '
    def timestamp_epoch:
      sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601;

    def relative_time($timestamp):
      ((now - ($timestamp | timestamp_epoch)) | floor) as $seconds
      | if $seconds < 60 then "now"
        elif $seconds < 3600 then "\($seconds / 60 | floor)m ago"
        elif $seconds < 86400 then "\($seconds / 3600 | floor)h ago"
        else "\($seconds / 86400 | floor)d ago"
        end;

    .result.snapshot as $snapshot
    | ($snapshot.workspaces | map(.label | length) | max // 0) as $project_width
    | ($snapshot.tabs
       | sort_by(if .focused then [0, 0]
                 elif $last_focused[.tab_id] then [1, -($last_focused[.tab_id] | timestamp_epoch)]
                 else [2, 0]
                 end)
      )[] as $tab
    | ($snapshot.workspaces[] | select(.workspace_id == $tab.workspace_id)) as $workspace
    | ([$snapshot.tabs[] | select(.workspace_id == $tab.workspace_id) | .tab_id]
       | index($tab.tab_id) + 1) as $tab_number
    | (if $tab.agent_status == "blocked" then "\u001b[31m×\u001b[0m"
       elif $tab.agent_status == "working" then "\u001b[33m◐\u001b[0m"
       elif $tab.agent_status == "done" then "\u001b[32m✓\u001b[0m"
       elif $tab.agent_status == "idle" then "\u001b[2m○\u001b[0m"
       else ""
       end) as $status
    | (if $tab.focused then "now"
       elif $last_focused[$tab.tab_id] then relative_time($last_focused[$tab.tab_id])
       else ""
       end) as $last_active
    | [
        ("\u001b[36m" + $workspace.label
         + (" " * ($project_width - ($workspace.label | length))) + "\u001b[0m"
         + "  \u001b[2m" + ($tab_number | tostring) + "\u001b[0m "
         + $tab.label
         + (if $status == "" then "" else " " + $status end)
         + (if $last_active == "" then ""
            else "  \u001b[2m" + $last_active + "\u001b[0m"
            end)),
        $tab.tab_id
      ]
    | @tsv
  '
}

for dependency in fzf herdr jq; do
  if ! command -v "$dependency" >/dev/null 2>&1; then
    printf 'Missing dependency: %s\n' "$dependency" >&2
    wait_for_close
    exit 1
  fi
done

tab=$(printf '\t')
selection=$(
  list_tabs | fzf \
    --ansi \
    --delimiter="$tab" \
    --with-nth=1 \
    --layout=reverse \
    --border=none \
    --info=hidden \
    --prompt='Tabs › '
) || exit 0

[ -n "$selection" ] || exit 0
herdr tab focus "${selection#*"$tab"}"
