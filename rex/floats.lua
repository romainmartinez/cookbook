local terminal = "com.superlogical.terminal"
local home = os.getenv("HOME")

local function foreground(block_id)
	return (rex.block.call(terminal, "process", { block_id = block_id }) or {}).foreground or {}
end

-- nvim listens on this socket per block (lazyvim lua/config/options.lua). Checking it first skips a process call per block.
local function socket(block_id)
	local sock = home .. "/.cache/rex-nvim/" .. block_id:gsub("^block:", "") .. ".sock"
	return os.rename(sock, sock) and sock
end

-- Prefers the focused block, then its tab, then the rest of the session.
local function find_nvim(ctx, fg)
	local placed, window = {}, nil
	for _, block in ipairs((rex.session.list_blocks({}) or {}).blocks or {}) do
		if block.placement == "placed" then
			placed[#placed + 1] = block
			if block.block_id == ctx.block_id then
				window = block.window_id
			end
		end
	end
	local function rank(block)
		return block.block_id == ctx.block_id and 0 or block.window_id == window and 1 or 2
	end
	table.sort(placed, function(a, b)
		return rank(a) < rank(b)
	end)
	for _, block in ipairs(placed) do
		local sock = socket(block.block_id)
		if sock and (block.block_id == ctx.block_id and fg or foreground(block.block_id)).name == "nvim" then
			return sock, block
		end
	end
end

local function float(...)
	local argv = { ... }
	return function(ctx)
		local fg = foreground(ctx.block_id)
		local command = argv
		local sock, nvim = find_nvim(ctx, fg)
		if sock then
			command = {
				"env",
				"NVIM=" .. sock,
				"REX_NVIM_BLOCK=" .. nvim.block_id,
				"REX_NVIM_WINDOW=" .. nvim.window_id,
				unpack(argv),
			}
		end
		rex.session.new_layer({
			bounds = { 0.01, 0.01, 0.98, 0.98 },
			focus = true,
			layout = rex.layout.block({
				flavor = "com.superlogical.terminal.shell",
				options = { command = command, cwd = fg.cwd },
			}),
		})
		return true
	end
end

rex.bind("ctrl+g", float("lazygit"))
rex.bind("ctrl+e", float(home .. "/.config/rex/yazi-to-nvim.sh"))
