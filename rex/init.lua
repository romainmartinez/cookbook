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
-- cmd+left/right emit ctrl+a/e, which the ctrl+e float below would catch, so write the bytes directly.
rex.bind("cmd+left", "com.superlogical.terminal.write", { data = "\1" })
rex.bind("cmd+right", "com.superlogical.terminal.write", { data = "\5" })

local function float(command, opts)
	opts = opts or {}
	local size = opts.size or 0.98
	return function(ctx)
		local process = rex.block.call("com.superlogical.terminal", "process", { block_id = ctx.block_id }) or {}
		rex.session.new_layer({
			bounds = { (1 - size) / 2, (1 - size) / 2, size, size },
			focus = true,
			layout = rex.layout.block({
				flavor = "com.superlogical.terminal.shell",
				options = {
					command = { command },
					cwd = process.foreground and process.foreground.cwd,
				},
			}),
		})
		return true
	end
end

rex.bind("ctrl+g", float("lazygit"))
rex.bind("ctrl+e", float("yazi"))
