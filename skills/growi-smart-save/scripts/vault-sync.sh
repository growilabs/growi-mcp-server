#!/bin/sh
# vault-sync.sh -- deterministic clone/refresh of a GROWI Vault clone, plus
# percent-decoding of on-disk Vault file names.
#
# Why a script: the clone/refresh steps are mechanical, and agent runners tend
# to reset the shell between invocations, so exported GIT_CONFIG_* variables do
# not survive from one command to the next. This script decides clone-vs-refresh
# itself and sets the auth header inside its own process. The PAT is read from
# the environment (GROWI_API_TOKEN_<n>) and never appears on a command line, in
# shell history, or in a transcript.
#
# Usage:
#   vault-sync.sh sync <n> [<dest-dir>] [--no-user]
#       Clone (first run) or fetch + reset to upstream (later runs) the Vault of
#       the GROWI instance configured as GROWI_BASE_URL_<n> / GROWI_API_TOKEN_<n>.
#       <dest-dir> defaults to the cache path `path <n>` prints, so every run
#       reuses the same clone instead of downloading the wiki again.
#       --no-user: leave the personal /user space out of the working tree
#       (effective on the first clone; an existing clone keeps its layout, so
#       passing or dropping the flag on a refresh changes nothing).
#   vault-sync.sh path <n>
#       Print the default clone directory for instance <n> and exit. Use it to
#       locate the clone for grepping without touching the network.
#   vault-sync.sh decode [<name>...]
#       Percent-decode on-disk Vault names back to GROWI page path segments
#       (e.g. '%3A' -> ':'). With no arguments, decodes each line of stdin.
#
# Requirements: POSIX sh; git >= 2.31 (GIT_CONFIG_* environment variables);
# git >= 2.35 additionally for --no-user.
# Exit codes: 0 = the clone is usable, 1 = usage or environment error,
# 2 = git failure or an unusable clone.

set -eu

fail() {
  printf 'vault-sync: error: %s\n' "$1" >&2
  exit "${2:-1}"
}

usage() {
  cat >&2 <<'EOF'
Usage:
  vault-sync.sh sync <n> [<dest-dir>] [--no-user]
      Clone or refresh the Vault of GROWI instance <n>.
      Reads GROWI_BASE_URL_<n> and GROWI_API_TOKEN_<n> from the environment.
      <dest-dir> defaults to what `path <n>` prints.
      --no-user: leave the personal /user space out of the working tree.
  vault-sync.sh path <n>
      Print the default clone directory for instance <n>.
  vault-sync.sh decode [<name>...]
      Percent-decode on-disk Vault names to GROWI page path segments.
      With no arguments, decodes each line of stdin.
EOF
  exit 1
}

# Strip the padding some `wc` implementations add, so the result can be used
# with `[ -eq ]`.
count_of() {
  printf '%s' "$1" | tr -d ' \t\n'
}

# --- decode -----------------------------------------------------------------

decode_one() {
  s=$1
  out=''
  while :; do
    case $s in
      *%*) ;;
      *) out=$out$s; break ;;
    esac
    pre=${s%%\%*}
    out=$out$pre
    s=${s#"$pre"}
    rest=${s#\%}
    case $rest in
      [0-9A-Fa-f][0-9A-Fa-f]*)
        hex=$(printf '%.2s' "$rest")
        out=$out$(printf "\\$(printf '%03o' "0x$hex")")
        s=${s#???}
        ;;
      *)
        out=$out%
        s=$rest
        ;;
    esac
  done
  printf '%s\n' "$out"
}

cmd_decode() {
  if [ $# -gt 0 ]; then
    for name in "$@"; do
      decode_one "$name"
    done
  else
    while IFS= read -r line || [ -n "$line" ]; do
      decode_one "$line"
    done
  fi
}

# --- instance configuration -------------------------------------------------

# Read GROWI_BASE_URL_<n> / GROWI_API_TOKEN_<n> into base_url / pat, and derive
# remote_url. `pat` is only needed by sync, so `want_pat` makes it optional.
read_instance_config() {
  n=$1
  want_pat=$2

  case $n in
    ''|*[!0-9]*) fail "instance number must be a positive integer, got '$n'" ;;
  esac

  eval "base_url=\${GROWI_BASE_URL_$n:-}"
  eval "pat=\${GROWI_API_TOKEN_$n:-}"
  [ -n "$base_url" ] || fail "GROWI_BASE_URL_$n is not set in the environment"
  if [ -n "$want_pat" ] && [ -z "$pat" ]; then
    fail "GROWI_API_TOKEN_$n is not set in the environment -- export it for this one call, taking the value from wherever the GROWI MCP server's config keeps it (see references/vault-clone-access.md for the concrete places to look)"
  fi

  base_url=${base_url%/}
  remote_url=$base_url/vault.git
}

# The clone directory for an instance. Derived from the base URL rather than
# from <n> so that renumbering or repointing an instance cannot silently make
# one clone stand in for a different wiki.
default_dest() {
  host_part=${base_url#*://}
  slug=$(printf '%s' "$host_part" | tr -c 'A-Za-z0-9._-' '-')
  [ -n "${XDG_CACHE_HOME:-}" ] || [ -n "${HOME:-}" ] \
    || fail 'neither XDG_CACHE_HOME nor HOME is set -- pass <dest-dir> explicitly'
  printf '%s/growi-vault/%s\n' "${XDG_CACHE_HOME:-$HOME/.cache}" "$slug"
}

cmd_path() {
  [ $# -eq 1 ] || usage
  read_instance_config "$1" ''
  default_dest
}

# --- sync -------------------------------------------------------------------

# Materialize the upstream tree.
#
# `git reset --hard` is all-or-nothing: if one page name exceeds the
# filesystem's limits it aborts without moving HEAD, so a single such page
# would make every later refresh fail forever. The fallback moves HEAD and the
# index with no file I/O, drops files that vanished upstream, then writes out
# every file the filesystem accepts.
#
# What must not happen is reporting success when the checkout failed for some
# other reason (an object that cannot be fetched, a full disk, a permission
# error): the caller reads exit 0 as "the clone is usable". Rather than guess
# from git's error text -- which is localized, so matching it is unreliable --
# count the tracked files that are still absent from the working tree.
reset_to_upstream() {
  dir=$1
  if reset_err=$(git -C "$dir" reset --hard '@{u}' 2>&1 >/dev/null); then
    return 0
  fi

  git -C "$dir" reset --quiet '@{u}' \
    || fail "git reset to upstream failed: $reset_err" 2
  git -C "$dir" clean -qfd || true
  checkout_err=$(git -C "$dir" checkout-index -qaf 2>&1 >/dev/null | head -5) || true

  # Tracked paths with no file in the working tree. Files left out by
  # sparse-checkout carry skip-worktree and are not reported here, so --no-user
  # does not look like a failed checkout.
  missing=$(count_of "$(git -C "$dir" diff-index --diff-filter=D --name-only HEAD | wc -l)")
  if [ "$missing" -eq 0 ]; then
    return 0
  fi
  tracked=$(count_of "$(git -C "$dir" ls-files | wc -l)")

  # A handful of pages this filesystem cannot name is the benign case the
  # fallback exists for: keep the rest and let discovery proceed. Anything
  # wider than that -- and in particular a checkout that produced nothing --
  # means the update itself failed, and the clone must not pass as usable.
  if [ "$missing" -le 10 ] && [ "$missing" -lt "$tracked" ]; then
    printf 'vault-sync: warning: %s of %s pages could not be written to this filesystem (most often a page name longer than it allows); continuing without them:\n' \
      "$missing" "$tracked" >&2
    git -C "$dir" diff-index --diff-filter=D --name-only HEAD >&2
    return 0
  fi

  fail "only $((tracked - missing)) of $tracked pages could be written to '$dir', so the clone is not usable: ${checkout_err:-$reset_err}" 2
}

cmd_sync() {
  [ $# -ge 1 ] || usage
  n=$1
  shift
  dest=''
  no_user=''
  for arg in "$@"; do
    case $arg in
      --no-user) no_user=1 ;;
      -*) usage ;;
      *)
        [ -z "$dest" ] || usage
        dest=$arg
        ;;
    esac
  done

  read_instance_config "$n" want-pat

  command -v git >/dev/null 2>&1 || fail 'git is not available on PATH'
  git_ver=$(git version | sed -n 's/^git version \([0-9][0-9]*\)\.\([0-9][0-9]*\).*/\1 \2/p')
  [ -n "$git_ver" ] || fail "cannot parse the output of 'git version'"
  maj=${git_ver% *}
  min=${git_ver#* }
  if [ "$maj" -lt 2 ] || { [ "$maj" -eq 2 ] && [ "$min" -lt 31 ]; }; then
    fail "git >= 2.31 is required (GIT_CONFIG_* support); found: $(git version)"
  fi

  [ -n "$dest" ] || dest=$(default_dest)

  # Auth lives only in this process's environment: it never appears on a
  # command line and is never persisted to .git/config.
  #   core.longpaths     lifts Git for Windows' 260-char path limit; other
  #                      platforms ignore the unknown key.
  #   credential.helper  set to empty, which resets the helper list. Without
  #                      this a 401 still invokes whatever helper the machine
  #                      has configured (Git Credential Manager, the VS Code
  #                      helper, ...), which can open a GUI prompt and block
  #                      indefinitely. GIT_TERMINAL_PROMPT=0 only suppresses
  #                      git's own terminal prompt, not the helpers.
  GIT_CONFIG_COUNT=3
  GIT_CONFIG_KEY_0=http.extraHeader
  GIT_CONFIG_VALUE_0="Authorization: Bearer $pat"
  GIT_CONFIG_KEY_1=core.longpaths
  GIT_CONFIG_VALUE_1=true
  GIT_CONFIG_KEY_2=credential.helper
  GIT_CONFIG_VALUE_2=
  GIT_TERMINAL_PROMPT=0
  export GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0 \
    GIT_CONFIG_KEY_1 GIT_CONFIG_VALUE_1 GIT_CONFIG_KEY_2 GIT_CONFIG_VALUE_2 \
    GIT_TERMINAL_PROMPT

  http_hint='(HTTP 401 = bad token, 404 = Vault disabled, 503 = bootstrap not finished)'

  if [ -e "$dest/.git" ]; then
    current_url=$(git -C "$dest" remote get-url origin 2>/dev/null) || current_url=''
    [ "$current_url" = "$remote_url" ] \
      || fail "'$dest' is a clone of '$current_url', not '$remote_url' -- wrong instance or wrong directory"
    git -C "$dest" fetch --quiet || fail "git fetch failed $http_hint" 2
    reset_to_upstream "$dest"
    printf 'vault-sync: refreshed %s\n' "$dest"
  else
    if [ -e "$dest" ] && [ -n "$(ls -A "$dest" 2>/dev/null)" ]; then
      fail "'$dest' exists, is not empty, and is not a git clone -- remove it or pick another directory"
    fi
    # No --filter=blob:none: the Vault endpoint does not advertise the filter
    # capability, so git would ignore it and print a confusing warning while
    # still transferring everything. Worse, it would mark the clone a promisor
    # repo, and the Vault deliberately refuses fetches of unadvertised objects
    # (uploadpack.allowAnySHA1InWant=false), so any lazy blob fetch would fail.
    git clone --quiet --no-checkout "$remote_url" "$dest" \
      || fail "git clone failed $http_hint" 2
    if [ -n "$no_user" ]; then
      # Patterns go via --stdin: on Git Bash (MSYS) a '/user' argument would be
      # rewritten into a Windows path before git ever sees it; stdin is safe.
      printf '%s\n' '/*' '!/user' \
        | git -C "$dest" sparse-checkout set --no-cone --stdin \
        || fail 'sparse-checkout setup failed (git >= 2.35 is required for --no-user)' 2
    fi
    reset_to_upstream "$dest"
    printf 'vault-sync: cloned %s\n' "$dest"
  fi
}

# --- main -------------------------------------------------------------------

[ $# -ge 1 ] || usage
cmd=$1
shift
case $cmd in
  sync) cmd_sync "$@" ;;
  path) cmd_path "$@" ;;
  decode) cmd_decode "$@" ;;
  *) usage ;;
esac
