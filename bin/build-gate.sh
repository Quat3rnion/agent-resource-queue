#!/usr/bin/env bash
# Coordination between heavy compiles and GPU turns that need a quiet host.
# Thin wrapper around the resource-queue store (resource "build", default capacity 4).
#
# Builders:   build-gate.sh build <command...>
#   Takes one "build" slot (up to capacity builds run at once). Waits at most BUILD_WAIT
#   seconds (default 1200). Exit 75 = no slot yet; retry in a new tool call.
# GPU turns:  build-gate.sh quiet <command...>
#   Takes all "build" slots: waits for running builds to finish (new builds queue behind it),
#   then runs the command. Use it INSIDE gpu-turn.sh:
#     gpu-turn.sh <nick> <secs> build-gate.sh quiet <command...>
#   Waits at most QUIET_WAIT seconds (default 600); exit 75 if builds did not drain.
# Queue place: set BUILD_GATE_NAME to keep your place across calls. Without it, a call that
# times out leaves the queue.
# Hold limits: BUILD_MAX_HOLD (default 7200 s), QUIET_MAX_HOLD (default 1800 s). Exit 124 = stopped.
# Migration: if a build flock file is set ($BUILD_FLOCK or "flocks.build" in the config), the command
# also runs under that flock (shared for build, exclusive for quiet), so old-style callers stay safe.
set -u
mode=${1:-}; shift || true
# Find the CLI: $RESOURCE_QUEUE_CLI, else src/cli.ts next to the real script (install the script as a
# symbolic link to the repository), else "resource-queue" on PATH (a link to src/cli.ts).
self=$(readlink -f "${BASH_SOURCE[0]}")
cli=${RESOURCE_QUEUE_CLI:-}
if [ -z "$cli" ]; then
  if [ -f "${self%/*}/../src/cli.ts" ]; then cli="${self%/*}/../src/cli.ts"
  elif command -v resource-queue >/dev/null 2>&1; then cli=$(readlink -f "$(command -v resource-queue)")
  else echo "${self##*/}: cannot find the resource-queue CLI. Set RESOURCE_QUEUE_CLI, or install this script as a symbolic link to bin/${self##*/} in the repository." >&2; exit 2
  fi
fi
bun=$(command -v bun || echo "$HOME/.bun/bin/bun")
if [ -n "${BUILD_GATE_NAME:-}" ]; then holder=$BUILD_GATE_NAME; keep=--keep; else holder="build-gate:$$"; keep=; fi
[ "$#" -gt 0 ] || mode=usage
case "$mode" in
  build) exec "$bun" "$cli" run --resource build --holder "$holder" $keep --max-hold "${BUILD_MAX_HOLD:-7200}" \
           --wait "${BUILD_WAIT:-1200}" --flock build --purpose "build: $*" -- "$@" ;;
  quiet) exec "$bun" "$cli" run --resource build --exclusive --holder "$holder" $keep --max-hold "${QUIET_MAX_HOLD:-1800}" \
           --wait "${QUIET_WAIT:-600}" --flock build --purpose "quiet: $*" -- "$@" ;;
  *) echo "usage: build-gate.sh build|quiet <command...>" >&2; exit 2 ;;
esac
