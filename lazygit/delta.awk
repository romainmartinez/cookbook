#!/usr/bin/awk -f
# Delta for lazygit: side-by-side on wide panes unless every file in the diff is added or deleted.
/^(\033\[[0-9;]*m)*diff --/ { files++ }
/^(\033\[[0-9;]*m)*(new|deleted) file mode / { one_sided++ }
{ lines[NR] = $0 }
END {
  cmd = "exec delta --paging=never --wrap-max-lines unlimited"
  if (width > 160 && files > one_sided) cmd = cmd " --side-by-side --line-numbers-left-format= --line-numbers-right-format=│"
  for (i = 1; i <= NR; i++) print lines[i] | cmd
}
