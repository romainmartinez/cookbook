#!/bin/sh

set -eu

state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/herdr-tab-activity"
herdr_bin="${HERDR_BIN_PATH:-herdr}"
event="${1:-${HERDR_PLUGIN_EVENT:-}}"

read_event_tab_id() {
  if [ -n "${HERDR_TAB_ID:-}" ]; then
    printf '%s\n' "$HERDR_TAB_ID"
  else
    printf '%s' "${HERDR_PLUGIN_EVENT_JSON:-}" | jq -r '.data.tab_id // empty'
  fi
}

read_focused_tab_id() {
  "$herdr_bin" api snapshot | jq -r '.result.snapshot.focused_tab_id // empty'
}

safe_tab_id() {
  case "$1" in
    ""|*/*|*..*) return 1 ;;
  esac
}

case "$event" in
  startup|workspace.focused|pane.focused)
    tab_id=$(read_focused_tab_id)
    ;;
  tab.created|tab.focused)
    tab_id=$(read_event_tab_id)
    ;;
  tab.closed)
    tab_id=$(read_event_tab_id)
    safe_tab_id "$tab_id" || exit 0
    rm -f "$state_dir/$tab_id"
    exit 0
    ;;
  *)
    exit 0
    ;;
esac

safe_tab_id "$tab_id" || exit 0
mkdir -p "$state_dir"
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$state_dir/$tab_id"
