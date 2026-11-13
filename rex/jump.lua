local M = {}

-- The pane the last jump came from. Lives until the config reloads.
local back

function M.remember(ctx)
	back = { session_id = ctx.session_id, block_id = ctx.block_id }
end

-- Rex.app picks its visible tab itself, so focusing the block on the server isn't enough.
function M.to(target)
	local ok, info = pcall(rex.session.describe_block, target)
	if not (ok and info and info.block and info.block.placement == "placed") then
		return false
	end
	rex.session.focus_block(target)
	rex.client.queue("session.select", { session_id = target.session_id, window_id = info.block.window_id })
	return true
end

rex.action({
	name = "jump_back",
	title = "Jump Back",
	category = "Navigation",
	run = function(ctx)
		if back and back.block_id ~= ctx.block_id and M.to(back) then
			M.remember(ctx)
		end
	end,
})

-- For scripts: rex do -s SESSION jump_to block_id=BLOCK. Errors so the script's && chain stops.
rex.action({
	name = "jump_to",
	title = "Jump to Block",
	category = "Navigation",
	run = function(ctx, args)
		if not M.to({ session_id = ctx.session_id, block_id = args.block_id }) then
			error("block is not placed: " .. tostring(args.block_id))
		end
	end,
})

rex.bind("cmd+;", "jump_back")

return M
