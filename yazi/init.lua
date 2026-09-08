require("git"):setup {
	order = 1500,
}

Status:children_remove(4, Status.RIGHT)
Status:children_remove(5, Status.RIGHT)
