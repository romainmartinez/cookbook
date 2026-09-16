---
description: Pull updates and apply required local setup changes
---

Pull the latest commits for the current branch, then make any local changes needed for them to work on this machine.

Before pulling, check for local changes and ask before proceeding if they could interfere. Record the old `HEAD`, pull using the repository's configured strategy, and review the commits and diff from the old `HEAD` to the new one.

Read the relevant setup documentation and detect the operating system. Apply only setup changes documented by this repository and required by the pulled commits. Do not inspect, update, or modify other repositories unless this repository's setup documentation explicitly requires it. Do not rerun the full setup, and remember that files behind existing symlinks update automatically. Ask before destructive actions, replacing unmanaged files, or commands requiring elevated privileges.

Verify what changed and briefly report the pulled commits, actions taken, and anything still requiring attention.
