source (dirname (realpath (status filename)))/base.fish

# ─── PATH ────────────────────────────────────────────────────────────
set -gx PNPM_HOME $HOME/.local/share/pnpm
fish_add_path $PNPM_HOME

# ─── FUNCTIONS ───────────────────────────────────────────────────────
function sysclean
    if command -q omarchy
        omarchy update
    else
        sudo pacman -Syu
    end

    set -l orphans (pacman -Qtdq)
    if test -n "$orphans"
        sudo pacman -Rns --noconfirm $orphans
    else
        echo "No orphaned packages to remove."
    end

    set -l stale_downloads /var/cache/pacman/pkg/download-*
    if set -q stale_downloads[1]
        sudo rm -rf -- $stale_downloads
    end

    sudo pacman -Sc --noconfirm
    pi update --extensions
end
