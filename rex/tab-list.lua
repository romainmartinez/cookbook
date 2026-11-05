local terminal = "com.superlogical.terminal"
local current_session = os.getenv("REX_SESSION")

local states = {
	blocked = { rank = 1, icon = "\27[31m×\27[0m" },
	done = { rank = 2, icon = "\27[32m✓\27[0m" },
	working = { rank = 3, icon = "\27[33m◐\27[0m" },
	idle = { rank = 3, icon = "\27[2m○\27[0m" },
}

local function width(text)
	return select(2, text:gsub("[^\128-\191]", ""))
end

local function clean(text, max_bytes)
	text = (text or ""):gsub("%s+", " ")
	if max_bytes and #text > max_bytes then
		text = text:sub(1, max_bytes):gsub("[\192-\255][\128-\191]*$", "") .. "…"
	end
	return text
end

local function program_state(session_id, block_id)
	local status = rex.block.call(terminal, "program_status", { session_id = session_id, block_id = block_id })
	local best = nil
	for _, record in ipairs(status and status.records or {}) do
		local state = states[record.state]
		if state and (not best or state.rank < best.state.rank) then
			best = { state = state, msg = record.msg }
		end
	end
	return best
end

local function tab_label(session_id, window)
	if not window.label:match("^Window %x%x%x%x%x%x%x%x$") then
		return clean(window.label)
	end
	local title = rex.block.call(terminal, "title", { session_id = session_id, block_id = window.focused_block_id })
	return title and title.title ~= "" and clean(title.title) or window.label
end

local sessions = rex.call("session.list").sessions
local project_width = 0
for _, session in ipairs(sessions) do
	project_width = math.max(project_width, width(session.label))
end

for _, session in ipairs(sessions) do
	rex.session.attach({ session_id = session.session_id })
	local view = rex.session.view({ session_id = session.session_id })
	local project = "\27[36m" .. session.label .. string.rep(" ", project_width - width(session.label)) .. "\27[0m"
	for index, window in ipairs(view and view.windows or {}) do
		if session.session_id ~= current_session or window.window_id ~= view.active_window_id then
			local label = tab_label(session.session_id, window)
			local program = program_state(session.session_id, window.focused_block_id)
			local status = ""
			if program then
				status = " " .. program.state.icon
				local msg = clean(program.msg, 60)
				if program.state.rank < 3 and msg ~= "" and not label:find(msg, 1, true) then
					status = status .. " \27[2m" .. msg .. "\27[0m"
				end
			end
			print(table.concat({
				project .. "  \27[2m" .. index .. "\27[0m " .. label .. status,
				session.session_id,
				window.window_id,
				window.focused_block_id,
			}, "\t"))
		end
	end
end
