local jump = require("jump")
local nvim = require("nvim")

local home = os.getenv("HOME")

-- Floats get the session's nvim, if any, so they can open files in it.
local function float(program)
	return function(ctx)
		local fg = nvim.foreground(ctx.block_id)
		local command = { program }
		local sock, block = nvim.find(ctx, fg)
		if sock then
			jump.remember(ctx)
			command = { "env", "NVIM=" .. sock, "REX_NVIM_BLOCK=" .. block.block_id, program }
		end
		rex.session.new_layer({
			bounds = { 0.01, 0.01, 0.98, 0.98 },
			focus = true,
			layout = rex.layout.block({
				flavor = "com.superlogical.terminal.shell",
				options = { command = command, cwd = fg.cwd },
			}),
		})
	end
end

rex.action({
	name = "lazygit",
	title = "Open Lazygit",
	category = "Floats",
	keywords = "git",
	run = float("lazygit"),
})
rex.action({
	name = "yazi",
	title = "Open Yazi",
	category = "Floats",
	keywords = "files file manager",
	run = float(home .. "/.config/rex/yazi-to-nvim.sh"),
})

rex.bind("ctrl+g", "lazygit")
rex.bind("ctrl+e", "yazi")
