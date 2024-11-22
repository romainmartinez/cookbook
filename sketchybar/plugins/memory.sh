#!/bin/bash

MEMORY_INFO=$(vm_stat | grep "Pages")

PAGES_ACTIVE=$(echo "$MEMORY_INFO" | grep "Pages active:" | awk '{print $3}' | sed 's/\.//')
PAGES_WIRED=$(echo "$MEMORY_INFO" | grep "Pages wired down:" | awk '{print $4}' | sed 's/\.//')

USED_GB=$(echo "scale=1; ($PAGES_ACTIVE + $PAGES_WIRED) * 4096 / 1024 / 1024 / 1024" | bc)

sketchybar --set $NAME label="${USED_GB}G"
