-- keybindings
rex.bind("cmd+w", "client.close")
rex.bind("cmd+[", "client.tab.previous")
rex.bind("cmd+]", "client.tab.next")
rex.bind("ctrl+cmd+[", "client.tab.move", { direction = "backward" })
rex.bind("ctrl+cmd+]", "client.tab.move", { direction = "forward" })
rex.bind("shift+cmd+t", "client.tab.rename")
rex.bind("shift+cmd+[", "session.previous")
rex.bind("shift+cmd+]", "session.next")
rex.bind("shift+cmd+,", "pane.focus_previous")
rex.bind("shift+cmd+.", "pane.focus_next")
-- cmd+left/right emit ctrl+a/e, which the ctrl+e float (floats.lua) would catch, so write the bytes directly.
rex.bind("cmd+left", "com.superlogical.terminal.write", { data = "\1" })
rex.bind("cmd+right", "com.superlogical.terminal.write", { data = "\5" })
-- Kitty-encoded super+backspace; ctrl+u would hit Pi's alt-screen halfPageUp instead.
rex.bind("cmd+backspace", "com.superlogical.terminal.write", { data = "\27[127;9u" })

rex.action({
	name = "session_goto",
	title = "Go to Session N",
	category = "Sessions",
	run = function(_, args)
		local session = (rex.call("session.list").sessions or {})[args.index]
		if session then
			rex.client.queue("session.select", { session_id = session.session_id })
		end
	end,
})
for i = 1, 9 do
	rex.bind("ctrl+cmd+" .. i, "session_goto", { index = i })
end

require("floats")
