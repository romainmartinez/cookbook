-- keybindings
rex.bind("cmd+w", "client.close")
rex.bind("cmd+[", "client.tab.previous")
rex.bind("cmd+]", "client.tab.next")
rex.bind("ctrl+cmd+[", "client.tab.move", { direction = "backward" })
rex.bind("ctrl+cmd+]", "client.tab.move", { direction = "forward" })
rex.bind("shift+cmd+[", "session.previous")
rex.bind("shift+cmd+]", "session.next")
rex.bind("shift+cmd+,", "pane.focus_previous")
rex.bind("shift+cmd+.", "pane.focus_next")
-- cmd+left/right emit ctrl+a/e, which the ctrl+e float (floats.lua) would catch, so write the bytes directly.
rex.bind("cmd+left", "com.superlogical.terminal.write", { data = "\1" })
rex.bind("cmd+right", "com.superlogical.terminal.write", { data = "\5" })
-- Kitty-encoded super+backspace; ctrl+u would hit Pi's alt-screen halfPageUp instead.
rex.bind("cmd+backspace", "com.superlogical.terminal.write", { data = "\27[127;9u" })

require("floats")
