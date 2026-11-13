local jump = require("jump")

local M = {}
local home = os.getenv("HOME")

function M.foreground(block_id)
	return (rex.block.call("com.superlogical.terminal", "process", { block_id = block_id }) or {}).foreground or {}
end

-- nvim listens on this socket per block (lazyvim lua/config/options.lua). Checking it first skips a process call per block.
local function socket(block_id)
	local sock = home .. "/.cache/rex-nvim/" .. block_id:gsub("^block:", "") .. ".sock"
	return os.rename(sock, sock) and sock
end

-- Prefers the focused block, then its tab, then the rest of the session.
-- fg, the focused block's foreground process, saves a call when the caller already has it.
function M.find(ctx, fg)
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
		if sock and (block.block_id == ctx.block_id and fg or M.foreground(block.block_id)).name == "nvim" then
			return sock, block
		end
	end
end

-- The server's PATH lacks Homebrew.
local env = { PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" }

local function snacks_gh(picker)
	return function(ctx)
		local sock, nvim = M.find(ctx)
		if not sock then
			return
		end
		rex.exec({ "nvim", "--server", sock, "--remote-send", "<Cmd>lua Snacks.picker." .. picker .. "()<CR>" }, { env = env })
		if nvim.block_id ~= ctx.block_id and jump.to({ session_id = ctx.session_id, block_id = nvim.block_id }) then
			jump.remember(ctx)
		end
	end
end

rex.action({ name = "gh_prs", title = "GitHub Pull Requests in Neovim", category = "GitHub", run = snacks_gh("gh_pr") })
rex.action({ name = "gh_issues", title = "GitHub Issues in Neovim", category = "GitHub", run = snacks_gh("gh_issue") })

return M
