#!/bin/bash

INTERFACE="en0"

function format_speed() {
    local bytes=$1
    if [ $bytes -gt 1073741824 ]; then
        echo "$(printf "%.1f" $((bytes / 1073741824.0)))GB/s"
    elif [ $bytes -gt 1048576 ]; then
        echo "$(printf "%.1f" $((bytes / 1048576.0)))MB/s"
    elif [ $bytes -gt 1024 ]; then
        echo "$(printf "%.1f" $((bytes / 1024.0)))KB/s"
    else
        echo "${bytes}B/s"
    fi
}

PREV_IN=$(netstat -ibn | grep -e "$INTERFACE" -m 1 | awk '{print $7}')
sleep 1
CURR_IN=$(netstat -ibn | grep -e "$INTERFACE" -m 1 | awk '{print $7}')

IN_SPEED=$((CURR_IN - PREV_IN))

IN_SPEED_FORMATTED=$(format_speed $IN_SPEED)

sketchybar --set $NAME label="${IN_SPEED_FORMATTED}"
