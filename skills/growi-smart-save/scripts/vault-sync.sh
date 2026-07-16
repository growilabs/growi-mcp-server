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
#   vault-sync.sh sync <n> <dest-dir> [--no-user]
#       Clone (first run) or fetch + hard-reset to upstream (later runs) the
#       Vault of the GROWI instance configured as GROWI_BASE_URL_<n> /
#       GROWI_API_TOKEN_<n> into <dest-dir>.
#       --no-user: leave the personal /user space out of the working tree
#       (effective on the first clone; an existing clone keeps its layout).
#   vault-sync.sh decode [<name>...]
#       Percent-decode on-disk Vault names back to GROWI page path segments
#       (e.g. '%3A' -> ':'). With no arguments, decodes each line of stdin.
#
# Requirements: POSIX sh; git >= 2.31 (GIT_CONFIG_* environment variables);
# git >= 2.35 additionally for --no-user.
# Exit codes: 0 = success, 1 = usage or environment error, 2 = git failure.

set -eu

fail() {
  printf 'vault-sync: error: %s\n' "$1" >&2
  exit "${2:-1}"
}

usage() {
  cat >&2 <<'EOF'
Usage:
  vault-sync.sh sync <n> <dest-dir> [--no-user]
      Clone or refresh the Vault of GROWI instance <n> into <dest-dir>.
      Reads GROWI_BASE_URL_<n> and GROWI_API_TOKEN_<n> from the environment.
      --no-user: leave the personal /user space out of the working tree.
  vault-sync.sh decode [<name>...]
      Percent-decode on-disk Vault names to GROWI page path segments.
      With no arguments, decodes each line of stdin.
EOF
  exit 1
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

# --- sync -------------------------------------------------------------------

# Materialize the upstream tree even when a few page names exceed the
# filesystem's limits ('Filename too long'): reset --hard aborts as a whole in
# that case, so fall back to a piecewise update -- move HEAD and the index
# with no file I/O, drop files that vanished upstream, then write out every
# file the filesystem accepts and warn about the rest.
reset_to_upstream() {
  dir=$1
  if git -C "$dir" reset --hard --quiet '@{u}' 2>/dev/null; then
    return 0
  fi
  git -C "$dir" reset --quiet '@{u}' \
    || fail 'git reset to upstream failed (see the git message above)' 2
  git -C "$dir" clean -qfd || true
  if git -C "$dir" checkout-index -qaf; then
    return 0
  fi
  printf 'vault-sync: warning: the pages listed above could not be materialized (their names exceed this filesystem'\''s limits); continuing without them\n' >&2
}

cmd_sync() {
  [ $# -ge 2 ] || usage
  n=$1
  dest=$2
  shift 2
  no_user=''
  for arg in "$@"; do
    case $arg in
      --no-user) no_user=1 ;;
      *) usage ;;
    esac
  done

  case $n in
    ''|*[!0-9]*) fail "instance number must be a positive integer, got '$n'" ;;
  esac

  eval "base_url=\${GROWI_BASE_URL_$n:-}"
  eval "pat=\${GROWI_API_TOKEN_$n:-}"
  [ -n "$base_url" ] || fail "GROWI_BASE_URL_$n is not set in the environment"
  [ -n "$pat" ] || fail "GROWI_API_TOKEN_$n is not set in the environment"

  command -v git >/dev/null 2>&1 || fail 'git is not available on PATH'
  git_ver=$(git version | sed -n 's/^git version \([0-9][0-9]*\)\.\([0-9][0-9]*\).*/\1 \2/p')
  [ -n "$git_ver" ] || fail "cannot parse the output of 'git version'"
  maj=${git_ver% *}
  min=${git_ver#* }
  if [ "$maj" -lt 2 ] || { [ "$maj" -eq 2 ] && [ "$min" -lt 31 ]; }; then
    fail "git >= 2.31 is required (GIT_CONFIG_* support); found: $(git version)"
  fi

  base_url=${base_url%/}
  remote_url=$base_url/vault.git

  # Auth lives only in this process's environment: it never appears on a
  # command line and is never persisted to .git/config. core.longpaths lifts
  # Git for Windows' 260-char path limit; other platforms ignore the key.
  GIT_CONFIG_COUNT=2
  GIT_CONFIG_KEY_0=http.extraHeader
  GIT_CONFIG_VALUE_0="Authorization: Bearer $pat"
  GIT_CONFIG_KEY_1=core.longpaths
  GIT_CONFIG_VALUE_1=true
  GIT_TERMINAL_PROMPT=0
  export GIT_CONFIG_COUNT GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0 \
    GIT_CONFIG_KEY_1 GIT_CONFIG_VALUE_1 GIT_TERMINAL_PROMPT

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
    git clone --quiet --filter=blob:none --no-checkout "$remote_url" "$dest" \
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
  decode) cmd_decode "$@" ;;
  *) usage ;;
esac
