-- keybindings
rex.bind("cmd+w", "client.close")
rex.bind("cmd+[", "client.tab.previous")
rex.bind("cmd+]", "client.tab.next")
rex.bind("ctrl+cmd+[", "client.tab.move", { direction = "backward" })
rex.bind("ctrl+cmd+]", "client.tab.move", { direction = "forward" })
rex.bind("shift+cmd+[", "session.previous")
rex.bind("shift+cmd+]", "session.next")
-- cmd+left/right emit ctrl+a/e, which the ctrl+e float below would catch, so write the bytes directly.
-- Lua 5.1 has no \x escapes.
rex.bind("cmd+left", "com.superlogical.terminal.write", { data = "\1" })
rex.bind("cmd+right", "com.superlogical.terminal.write", { data = "\5" })

local function float(command, opts)
	opts = opts or {}
	local width = opts.width or 0.98
	local height = opts.height or width
	return function(ctx)
		local process = rex.block.call("com.superlogical.terminal", "process", { block_id = ctx.block_id }) or {}
		rex.session.new_layer({
			bounds = { (1 - width) / 2, (1 - height) / 2, width, height },
			focus = true,
			layout = rex.layout.block({
				flavor = "com.superlogical.terminal.shell",
				options = {
					command = { command },
					shell = opts.shell,
					path_prepend = opts.path_prepend,
					cwd = process.foreground and process.foreground.cwd,
				},
			}),
		})
		return true
	end
end

rex.bind("ctrl+g", float("lazygit"))
rex.bind("ctrl+e", float("yazi"))
rex.bind("cmd+space", float(os.getenv("HOME") .. "/.config/rex/tab-picker.sh", { width = 0.8, height = 0.8, shell = "none", path_prepend = { "/opt/homebrew/bin" } }))
