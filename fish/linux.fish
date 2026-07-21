source (dirname (realpath (status filename)))/base.fish

# ─── PATH ────────────────────────────────────────────────────────────
set -gx PNPM_HOME $HOME/.local/share/pnpm
fish_add_path $PNPM_HOME

# ─── FUNCTIONS ───────────────────────────────────────────────────────
function sysclean
    omarchy update

    set -l orphans (pacman -Qtdq)
    if test -n "$orphans"
        sudo pacman -Rns --noconfirm $orphans
    else
        echo "No orphaned packages to remove."
    end

    sudo pacman -Sc --noconfirm
end

# notify when a long-running command finishes
function __notify_done --on-event fish_postexec
    set -l cmd_duration_sec (math $CMD_DURATION / 1000)
    if test $cmd_duration_sec -gt 5
        notify-send "Done in $cmd_duration_sec s" "$argv[1]"
    end
end
