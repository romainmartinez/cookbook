my $query = shift // "";
my @terms = grep { length && $_ ne "|" } map { s/^['^]+|\$$//gr } grep { !/^!/ } split " ", $query;
my $pattern = join "|", map { /\p{Lu}/ ? quotemeta : "(?i:\Q$_\E)" } sort { length $b <=> length $a } @terms;
while (<>) {
  s/(\e\[[0-9;?]*[A-Za-z]|\e\][^\a\e]*(?:\a|\e\\))|($pattern)/$1 \/\/ "\e[7m$2\e[27m"/ge if @terms;
  print;
}
