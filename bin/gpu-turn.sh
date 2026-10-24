#!/usr/bin/env bash
# Fair FIFO GPU turn queue. Thin wrapper around the resource-queue store (resource "gpu").
# Usage: gpu-turn.sh <agent-name> <max-turn-seconds> <command...>
# - Takes a ticket on first call; the ticket survives across tool calls (same agent name).
# - Waits at most GPU_QUEUE_WAIT seconds (default 900) per call for its turn.
#   Exit 75 = not your turn yet: call again (keep the same agent name).
# - Runs the command when it holds the lock, then leaves the queue. The command is stopped
#   after <max-turn-seconds> (exit 124).
# - Tickets whose owner has not polled for 15 min are dropped (dead agents).
# - Migration: if a gpu flock file is set ($GPU_FLOCK or "flocks.gpu" in the config), the command also
#   runs under that flock, for old tools that use the file directly.
set -u
name=${1:?agent-name}; max=${2:?max-turn-seconds}; shift 2
[ "$#" -gt 0 ] || { echo "usage: gpu-turn.sh <agent-name> <max-turn-seconds> <command...>" >&2; exit 2; }
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
exec "$bun" "$cli" run --resource gpu --holder "$name" --keep --max-hold "$max" --flock gpu \
  --wait "${GPU_QUEUE_WAIT:-900}" --purpose "gpu-turn: $*" -- "$@"
