-- Hyper = Caps Lock via keyd (Super+Ctrl+Alt+Shift).
o.bind("SUPER + CTRL + ALT + SHIFT + B", "Browser", { launch = "omarchy-launch-browser", focus = "chromium" })
o.bind("SUPER + CTRL + ALT + SHIFT + F", "Terminal", { launch = "omarchy-launch-terminal", focus = "ghostty" })
o.bind("SUPER + CTRL + ALT + SHIFT + S", "File manager (cwd)", { launch = "omarchy-launch-nautilus-cwd", focus = "nautilus" })
o.bind("SUPER + CTRL + ALT + SHIFT + C", "Clipboard manager", "omarchy-shell shell toggle omarchy.clipboard")
o.bind("SUPER + CTRL + ALT + SHIFT + N", "Obsidian", { launch = "obsidian", focus = "obsidian" })

local function send_shortcut(mods, key)
  hl.dispatch(hl.dsp.send_shortcut({ mods = mods, key = key }))
end

local function active_window_is_chromium()
  local window = hl.get_active_window()
  if not window then
    return false
  end

  for _, tag in ipairs(window.tags or {}) do
    if tag:gsub("%*$", "") == "chromium-based-browser" then
      return true
    end
  end

  return false
end

local function bind_chromium_shortcut(keys, chromium_mods, chromium_key, fallback_mods, fallback_key)
  o.bind(keys, nil, function()
    if active_window_is_chromium() then
      send_shortcut(chromium_mods, chromium_key)
    else
      send_shortcut(fallback_mods, fallback_key)
    end
  end)
end

bind_chromium_shortcut("ALT + BRACKETLEFT", "CTRL", "Page_Up", "SUPER", "BRACKETLEFT")
bind_chromium_shortcut("ALT + BRACKETRIGHT", "CTRL", "Page_Down", "SUPER", "BRACKETRIGHT")
bind_chromium_shortcut("ALT + CTRL + BRACKETLEFT", "CTRL SHIFT", "Page_Up", "SUPER CTRL", "BRACKETLEFT")
bind_chromium_shortcut("ALT + CTRL + BRACKETRIGHT", "CTRL SHIFT", "Page_Down", "SUPER CTRL", "BRACKETRIGHT")
bind_chromium_shortcut("ALT + SHIFT + BRACKETLEFT", "ALT", "LEFT", "SUPER SHIFT", "BRACKETLEFT")
bind_chromium_shortcut("ALT + SHIFT + BRACKETRIGHT", "ALT", "RIGHT", "SUPER SHIFT", "BRACKETRIGHT")
bind_chromium_shortcut("ALT + T", "CTRL", "T", "SUPER", "T")
bind_chromium_shortcut("ALT + W", "CTRL", "W", "SUPER", "W")
bind_chromium_shortcut("CTRL + G", "CTRL SHIFT", "A", "CTRL", "G")

-- Right Shift tap (keyd emits F13/XF86Tools) opens the Omarchy menu.
o.bind("XF86Tools", "Omarchy menu (right shift tap)", "omarchy-menu toggle")

-- SUPER+F is full screen by default. Use full width while keeping the bars.
hl.unbind("SUPER + F")
o.bind("SUPER + F", "Full width", hl.dsp.window.fullscreen({ mode = "maximized" }))
