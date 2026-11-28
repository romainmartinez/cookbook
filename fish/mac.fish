source (dirname (realpath (status filename)))/base.fish

# ─── PATH ────────────────────────────────────────────────────────────
fish_add_path /opt/homebrew/bin
fish_add_path /opt/homebrew/sbin

set -gx PNPM_HOME $HOME/Library/pnpm
fish_add_path $PNPM_HOME

# ─── ENVIRONMENT ─────────────────────────────────────────────────────
set -gx HOMEBREW_NO_UPGRADE_AUTO_UPDATES_CASKS 1

# ─── MANULIFE (proxy + certificates) ─────────────────────────────────
set -l proxy_url "http://127.0.0.1:9000"
set -gx HTTP_PROXY $proxy_url
set -gx HTTPS_PROXY $proxy_url
set -gx NO_PROXY "localhost,127.0.0.1"

set -gx CERT_FILE /usr/local/share/ca-certificates/manulife-cacert.pem
set -gx PIP_CERT $CERT_FILE
set -gx REQUESTS_CA_BUNDLE $CERT_FILE
set -gx SSL_CERT_FILE $CERT_FILE
set -gx NODE_EXTRA_CA_CERTS $CERT_FILE

# ─── ALIASES ─────────────────────────────────────────────────────────
alias sysclean='brew update && brew upgrade --yes && brew autoremove && brew cleanup && brew doctor; pi update --extensions'
