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
# Migration: the command also runs under the old flock (shared for build, exclusive for quiet) on
# BUILD_FLOCK (default /arboretum/gpu-queue/build.lock), so old-style callers stay safe.
set -u
mode=${1:-}; shift || true
cli=${RESOURCE_QUEUE_CLI:-$HOME/Projects/agent-resource-guarding/src/cli.ts}
bun=$(command -v bun || echo "$HOME/.bun/bin/bun")
lock=${BUILD_FLOCK:-/arboretum/gpu-queue/build.lock}
if [ -n "${BUILD_GATE_NAME:-}" ]; then holder=$BUILD_GATE_NAME; keep=--keep; else holder="build-gate:$$"; keep=; fi
[ "$#" -gt 0 ] || mode=usage
case "$mode" in
  build) exec "$bun" "$cli" run --resource build --holder "$holder" $keep --max-hold "${BUILD_MAX_HOLD:-7200}" \
           --wait "${BUILD_WAIT:-1200}" --purpose "build: $*" -- flock -s -E 75 -w "${BUILD_WAIT:-1200}" "$lock" "$@" ;;
  quiet) exec "$bun" "$cli" run --resource build --exclusive --holder "$holder" $keep --max-hold "${QUIET_MAX_HOLD:-1800}" \
           --wait "${QUIET_WAIT:-600}" --purpose "quiet: $*" -- flock -x -E 75 -w "${QUIET_WAIT:-600}" "$lock" "$@" ;;
  *) echo "usage: build-gate.sh build|quiet <command...>" >&2; exit 2 ;;
esac
