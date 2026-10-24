#!/usr/bin/env bash
# Fair FIFO GPU turn queue. Thin wrapper around the resource-queue store (resource "gpu").
# Usage: gpu-turn.sh <agent-name> <max-turn-seconds> <command...>
# - Takes a ticket on first call; the ticket survives across tool calls (same agent name).
# - Waits at most GPU_QUEUE_WAIT seconds (default 900) per call for its turn.
#   Exit 75 = not your turn yet: call again (keep the same agent name).
# - Runs the command when it holds the lock, then leaves the queue. The command is stopped
#   after <max-turn-seconds> (exit 124).
# - Tickets whose owner has not polled for 15 min are dropped (dead agents).
# - The command also runs under flock on /arboretum/rdna-gpu-tests.lock, for tools that use it directly.
set -u
name=${1:?agent-name}; max=${2:?max-turn-seconds}; shift 2
[ "$#" -gt 0 ] || { echo "usage: gpu-turn.sh <agent-name> <max-turn-seconds> <command...>" >&2; exit 2; }
cli=${RESOURCE_QUEUE_CLI:-$HOME/Projects/agent-resource-guarding/src/cli.ts}
bun=$(command -v bun || echo "$HOME/.bun/bin/bun")
lock=${GPU_FLOCK:-/arboretum/rdna-gpu-tests.lock}
exec "$bun" "$cli" run --resource gpu --holder "$name" --keep --max-hold "$max" \
  --wait "${GPU_QUEUE_WAIT:-900}" --purpose "gpu-turn: $*" -- \
  flock -E 75 -w 600 "$lock" "$@"
