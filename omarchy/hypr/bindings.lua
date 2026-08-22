-- Hyper = Caps Lock via keyd (Super+Ctrl+Alt+Shift).
o.bind("SUPER + CTRL + ALT + SHIFT + B", "Browser", { omarchy = "browser" })
o.bind("SUPER + CTRL + ALT + SHIFT + F", "Terminal", { omarchy = "terminal" })
o.bind("SUPER + CTRL + ALT + SHIFT + S", "File manager (cwd)", { omarchy = "nautilus-cwd" })
o.bind("SUPER + CTRL + ALT + SHIFT + C", "Clipboard manager", "omarchy-shell shell toggle omarchy.clipboard")
o.bind("SUPER + CTRL + ALT + SHIFT + N", "Obsidian", { launch = "obsidian", focus = "^obsidian$" })

-- Right Shift tap (keyd emits F13/XF86Tools) opens the Omarchy menu.
o.bind("XF86Tools", "Omarchy menu (right shift tap)", "omarchy-menu toggle")

-- SUPER+F is full screen by default. Use full width while keeping the bars.
hl.unbind("SUPER + F")
o.bind("SUPER + F", "Full width", hl.dsp.window.fullscreen({ mode = "maximized" }))
