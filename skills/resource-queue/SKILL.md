---
name: resource-queue
description: How to share host resources such as the GPU and build slots with other agents through the resource-queue FIFO locks (resource_acquire, resource_wait, resource_release, resource_cancel, resource_status, resource_run, and the shell scripts /arboretum/gpu-queue/gpu-turn.sh and build-gate.sh). Use before you run GPU work, benchmarks, model loads or heavy compiles (hipcc, clang, make, cargo), when a command needs a quiet host, or when you need to know who holds the GPU or the build slots.
---

# resource-queue: share the GPU and the build slots

Other agents use the same host. Get a lock before you use a shared resource. The queue is strict FIFO: the first ticket gets the lock first.

## Resources

| Resource | Capacity | Use it for |
| --- | --- | --- |
| `gpu` | 1 | All GPU work: tests, benchmarks, model loads, profiling. |
| `build` | 4 | Heavy compiles (hipcc, clang, ld, large make or cargo builds). Each build uses 1 slot. |
| `build` + `exclusive: true` | all slots | A quiet host: no builds run. Use it for GPU timing runs and large model loads. |

Other names are permitted. A new resource has capacity 1.

## Run one command: use resource_run

For one command, use `resource_run`. It gets the lock, runs the command and always releases the lock.

```
resource_run({ resource: "gpu", holder: "<your agent name>", nick: "<your IRC nick>",
               cmd: "bash bench.sh", max_hold_sec: 1200, timeout_sec: 600 })
```

- If the result is `waiting`, call `resource_run` again with `ticket: "<ticket>"` and the same arguments. Do this in the next tool call. You keep your place.
- The result shows the exit code and the last part of the output. The full output is in the log file that the result names.
- Exit code 124 means the command ran longer than `max_hold_sec` and was stopped.

## Several steps: acquire, wait, release

Use this flow when you hold the resource across several tool calls.

1. `resource_acquire({ resource, holder, nick, purpose, max_hold_sec })`. Keep the ticket ID.
2. If the status is `waiting`: call `resource_wait({ ticket, timeout_sec: 600 })`. On `waiting`, call it again immediately. Do not do other long work between the calls.
3. On `granted`: do the work.
4. Call `resource_release({ ticket })`. Do this also when your work fails.

If you do not need the resource any more, call `resource_cancel({ ticket })`.

## Rules

- **Always release.** Other agents wait for you. The lock is released automatically after `max_hold_sec`, but the time is lost for the others.
- **Set a real `max_hold_sec`.** Use the expected time plus a margin. Do not use a very large value.
- **Poll without a break.** A waiting ticket expires after 15 minutes without a poll. A granted ticket expires if you do not see the grant in 5 minutes.
- **One wait call is 600 seconds at most.** opencode stops a session that has no events for 60 minutes. So never wait in one call for a long time.
- **Give `holder`, `nick` and `purpose`.** Other agents see them in `resource_status` and can contact you on IRC.
- **Do not hold a lock while you think or wait for a person.** Release it, then acquire again.
- **Subagents** have their own session, so they own their own tickets. A parent cannot release the ticket of a subagent.

## Preconditions

Add preconditions when your work needs a calm host. The ticket keeps its place until they pass. The ticket does not fail.

```
preconditions: [
  { "kind": "mem_available", "min_kb": 8000000, "for_sec": 60 },
  { "kind": "no_process", "names": ["hipcc", "clang", "ld"] }
]
```

`for_sec` means: the checks must pass without a break for this number of seconds. Tickets behind yours on the same resource also wait, so use only the preconditions that you need.

## Shell scripts

Use these when you cannot call the tools, for example in a script. They use the same queue as the tools.

```sh
/arboretum/gpu-queue/gpu-turn.sh <agent-name> <max-turn-seconds> <command...>
/arboretum/gpu-queue/build-gate.sh build <command...>
/arboretum/gpu-queue/gpu-turn.sh <agent-name> <secs> /arboretum/gpu-queue/build-gate.sh quiet <command...>
```

- Exit code 75: you do not have the lock yet. Call again in a new tool call. For `gpu-turn.sh`, use the same agent name to keep your place. For `build-gate.sh`, set `BUILD_GATE_NAME=<your agent name>` to keep your place.
- Any other exit code is the exit code of your command.
- Do not use `resource_run` and a script for the same resource in one command. You would wait for your own lock.

## Who holds what

- `resource_status({})` or `resource_status({ resource: "gpu" })` shows the holders, the queue, the hold times and the recent results.
- In a shell: `bun ~/Projects/agent-resource-guarding/src/cli.ts status`.
- If a holder blocks you for a long time, ask the holder on IRC (the `nick` in the status). Do not delete files in `/arboretum/resource-queue`. Locks of dead processes and ended sessions are released automatically.

Full documentation: `~/Projects/agent-resource-guarding/README.md`.
