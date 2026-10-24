# resource-queue

resource-queue is an opencode plugin and a command-line tool. It controls access to shared system resources, for example the GPU or the build slots of a host. Agents get a lock on a named resource. When the resource is busy, agents wait in a FIFO queue.

All opencode server processes, all sessions and the shell scripts use the same store. The store is a SQLite database in WAL mode. Each change to the queue is one `BEGIN IMMEDIATE` transaction, so many processes can use the store at the same time.

## Install

Agents: follow [INSTALL.md](INSTALL.md). It has the same steps, with a check after each step.

### Requirements

- Linux. The store reads `/proc` to check processes and memory.
- Bun 1.1 or newer.
- opencode v2 (tested with 2.0.32 and 2.1.3).
- `flock` (util-linux), only if you use migration flocks (see [Configuration](#configuration)).

### Steps

In these steps, `$REPO` is the directory of the repository, for example `~/src/agent-resource-queue`.

1. Get the source:

   ```sh
   git clone https://github.com/Quat3rnion/agent-resource-queue.git "$REPO"
   ```

2. Run the tests:

   ```sh
   cd "$REPO" && bun test
   ```

3. Put the CLI on your PATH as the command `resource-queue`:

   ```sh
   mkdir -p ~/.local/bin && ln -sfn "$REPO/src/cli.ts" ~/.local/bin/resource-queue
   ```

   `~/.local/bin` must be in `PATH`.

4. Install the plugin. Make the file `~/.config/opencode/plugins/resource-queue.ts`. Replace `$REPO` with the full path:

   ```ts
   import base from "$REPO/src/plugin.ts"
   export default base
   ```

5. Install the agent skill. The skill tells agents when and how to use the locks:

   ```sh
   ln -sfn "$REPO/skills/resource-queue" ~/.config/opencode/skills/resource-queue
   ```

6. Optional: install the shell scripts. Install them as symbolic links, so that they find the CLI in the repository:

   ```sh
   mkdir -p ~/.local/bin
   for f in gpu-turn.sh build-gate.sh; do ln -sfn "$REPO/bin/$f" ~/.local/bin/$f; done
   ```

   If you replace old scripts with the same names, see [Migrate from flock scripts](#migrate-from-flock-scripts).

7. Optional: choose the store directory (see [Configuration](#configuration)). All users of the queue must use the same directory.

8. Restart the opencode server. The plugin loads when the server starts.

9. Make sure that it works:

   ```sh
   resource-queue config
   resource-queue status
   ```

   In an opencode session, the tools `resource_acquire`, `resource_wait`, `resource_release`, `resource_cancel`, `resource_status` and `resource_run` are available.

### Configuration

The plugin, the CLI, the shell scripts and the OpenChamber extension find the store in the same way. The first item that is set is used:

1. An explicit value: the plugin option `dir`, the CLI option `--dir`, or the Store field in the OpenChamber panel.
2. The environment variable `RESOURCE_QUEUE_DIR`.
3. `"dir"` in the config file `~/.config/resource-queue/config.json` (or `$XDG_CONFIG_HOME/resource-queue/config.json`).
4. `~/.local/state/resource-queue` (or `$XDG_STATE_HOME/resource-queue`).

Use the config file when processes do not get the same environment, for example the opencode server and the OpenChamber service. Example:

```json
{ "dir": "/srv/resource-queue", "flocks": { "gpu": "/var/lock/gpu-tests.lock", "build": "/srv/gpu-queue/build.lock" } }
```

`flocks` is optional. See [Migrate from flock scripts](#migrate-from-flock-scripts). The command `resource-queue config` shows the values that are used.

To set plugin options, wrap `setup` and give `ctx.options` (see `plugins/agent-comms.ts` for an example). The options are:

| Option | Default | Meaning |
| --- | --- | --- |
| `dir` | See the list above | Directory of the store. Do not use `/tmp`. The store refuses it. |
| `checkIntervalMs` | `2000` | Time between two checks while a ticket waits. |
| `staleSec` | `900` | A waiting ticket expires when nobody polls it for this time. |
| `claimSec` | `300` | A granted ticket expires when its owner does not see the grant in this time. |
| `capacity` | `{ "gpu": 1, "build": 4 }` | Number of parallel holders for each resource. These values apply only when the resource is new in the store. A resource that is not in the store gets capacity 1. |

To change the capacity of a resource in the store, use `resource-queue capacity --resource build --set 6`.

## Concepts

- **Ticket**: Your place in the queue of one resource. A ticket has one of these states: `waiting`, `held`, `released`, `expired` or `canceled`.
- **Owner**: The opencode session that made the ticket. Tickets from the shell have no session. For these tickets, the holder name is the owner. Only the owner can wait on, release or cancel a ticket.
- **Holder and nick**: Give a holder name, for example your agent name. Also give your IRC nick, so that other agents can find the holder. Subagents use their own session, so they own their own tickets.
- **Capacity**: The number of tickets that can hold a resource at the same time. An `exclusive` ticket uses all slots.
- **Strict FIFO**: The queue of a resource always grants the first waiting ticket first. A ticket never passes a ticket in front of it. Queues of different resources do not affect each other.

## Tools

### resource_acquire

Puts a new ticket at the end of the queue. If a slot is free, the tool gives the lock immediately.

| Argument | Required | Meaning |
| --- | --- | --- |
| `resource` | yes | Resource name, for example `gpu` or `build`. Use letters, digits, `.`, `_` and `-`. |
| `holder` | yes | Your name. |
| `purpose` | yes | What you use the resource for. The status and the log show it. |
| `max_hold_sec` | yes | The maximum time that you hold the lock. After this time, the lock is released automatically. The time starts when you see the grant. |
| `nick` | no | Your IRC nick. |
| `exclusive` | no | Use all slots of the resource. Example: a quiet host with no builds. |
| `preconditions` | no | Checks that must pass before you get the lock. See [Preconditions](#preconditions). |

The result gives the ticket ID, the status, the queue position and an estimated wait time. The estimate uses the mean hold time of the last 20 holders.

If the same session and holder already have an active ticket on the resource, the tool gives that ticket. It does not make a second ticket.

### resource_wait

Waits until the ticket holds the lock or until `timeout_sec` is over. The maximum value of `timeout_sec` is 600 seconds. opencode stops a session that shows no events for 60 minutes. Thus a tool call must not wait for a long time.

The result is one of these:

- `granted`: You hold the lock. Do your work. Then call `resource_release`.
- `waiting`: The result gives your current position. Call `resource_wait` again.
- `expired` or `canceled`: The ticket ended. The result gives the reason.

Call `resource_wait` again soon after a `waiting` result. A waiting ticket that is not polled for `staleSec` expires.

### resource_release

Releases the lock, or removes a waiting ticket from the queue. Then the next ticket in the queue can get the lock.

### resource_cancel

Cancels a ticket. Only the owner of the ticket can cancel it.

### resource_status

Shows the holders, the queue, the hold times, the wait times and the recent results. Give `resource` to see only one resource.

### resource_run

Gets the lock, runs a shell command with `bash -c` and releases the lock.

| Argument | Required | Meaning |
| --- | --- | --- |
| `resource`, `holder`, `cmd`, `max_hold_sec` | yes | `cmd` is the shell command. When `max_hold_sec` is over, the tool stops the command with TERM, and with KILL after 15 seconds. The exit code is then 124. |
| `timeout_sec` | no | The maximum wait for the lock, at most 600 seconds. |
| `ticket` | no | The ticket from an earlier `resource_run` call that gave `waiting`. |
| `nick`, `purpose`, `exclusive`, `preconditions`, `cwd` | no | As for `resource_acquire`. `cwd` is the working directory. |

If the lock is not available in time, the tool gives the ticket. Call `resource_run` again with this ticket to keep your place.

The tool writes the full output to `<dir>/runs/<ticket>.log`. While the command runs, the tool sends the last part of the output as progress. The result contains the exit code and the last 30,000 characters of the output.

## Preconditions

A precondition is a check of the host. The store checks the preconditions of the first ticket in the queue before it gives the lock. If a check fails, the ticket keeps its place and the store checks it again at the next poll. The ticket does not fail. Because the queue is strict FIFO, the tickets behind it on the same resource also wait.

| Kind | Fields | Passes when |
| --- | --- | --- |
| `mem_available` | `min_kb`, `for_sec` | `MemAvailable` in `/proc/meminfo` is at least `min_kb`. |
| `no_process` | `names`, `for_sec` | No process has one of these names (`/proc/<pid>/comm`). A name also matches the same name with a version or a target prefix: `clang` matches `clang-22`, `gcc` matches `x86_64-linux-gnu-gcc-13`. |
| `no_compiler` | `for_sec` | No compiler, assembler or linker runs. The list is `COMPILERS` in `src/proc.ts` (for example `hipcc`, `clang`, `cc1plus`, `gcc`, `rustc`, `ld`, `ld.lld`). The same name rule applies. |

`for_sec` is optional. All preconditions of the ticket must then pass at each poll for this number of seconds without a break. A failure starts the count again.

Example: at least 8 GB available for 60 seconds, and no compiler is running:

```json
[
  { "kind": "mem_available", "min_kb": 8000000, "for_sec": 60 },
  { "kind": "no_compiler" }
]
```

## Crash safety

Each poll of each ticket first removes tickets whose owner is gone. You do not have to clean up a stale lock. The store ends a ticket in these conditions:

- **The session ends**: The plugin receives `session.deleted` and releases the tickets of the session.
- **The process dies**: The store records the PID and the start time of the owner process. For `resource_run` and the shell scripts, the store also records the command process. A ticket ends when all its recorded processes are dead. The start time makes sure that a new process with the same PID does not keep the lock.
- **`max_hold_sec` is over.**
- **Nobody sees the grant**: The owner does not see a granted lock in `claimSec`.
- **Nobody polls a waiting ticket** for `staleSec`.

The PID check works only on the host that made the ticket.

## Log

The store records each queue change in the `events` table and in `<dir>/events.log` (one JSON object for each line). Each record has the time, the event, the ticket, the resource, the holder, the nick, the session, the purpose, the duration and the reason.

The events are: `enqueue`, `granted`, `precondition-blocked`, and `released`, `expired` or `canceled`. The end events add `(held)` or `(waiting)`. For an end event, the duration is the hold time or the wait time.

## Command-line tool

`src/cli.ts` gives the same functions to shell scripts. Run `bun src/cli.ts --help` for all options.

```sh
bun src/cli.ts status
bun src/cli.ts run --resource gpu --holder my-agent --keep --max-hold 600 --wait 900 -- ./bench.sh
```

Exit codes: `0` granted or done, `75` not granted yet (call again), `124` the command ran out of time, `1` the ticket ended or an error occurred, `2` incorrect usage. `run` gives the exit code of the command.

`--keep` keeps a waiting ticket after the process stops. Call again with the same `--holder` to keep your place. Without `--keep`, the ticket ends with the process.

## Shell scripts

`bin/gpu-turn.sh` and `bin/build-gate.sh` give the queue to shell users. They use the same store as the plugin, so shell users and plugin users share one queue.

```sh
gpu-turn.sh <agent-name> <max-turn-seconds> <command...>
build-gate.sh build <command...>
build-gate.sh quiet <command...>
gpu-turn.sh <agent-name> <secs> build-gate.sh quiet <command...>
```

- `gpu-turn.sh` uses the resource `gpu`. The ticket stays in the queue across calls with the same agent name. `GPU_QUEUE_WAIT` sets the wait for each call (default 900 seconds).
- `build-gate.sh build` uses one slot of the resource `build`. `build-gate.sh quiet` uses all slots. New builds wait behind a quiet ticket. `BUILD_WAIT` and `QUIET_WAIT` set the wait (default 1200 and 600 seconds). `BUILD_MAX_HOLD` and `QUIET_MAX_HOLD` set the hold limit (default 7200 and 1800 seconds). Set `BUILD_GATE_NAME` to keep your place across calls.
- Exit code 75: you do not have the lock yet. Call again. Exit code 124: the command ran out of time. Other exit codes come from your command.
- The scripts find the CLI in this order: `$RESOURCE_QUEUE_CLI`, then `src/cli.ts` next to the real script (when the script is a symbolic link to the repository), then `resource-queue` on PATH.

### Migrate from flock scripts

Older scripts with these names used plain `flock` files. During a migration, old processes can still hold these files. To prevent overlap, set the files in `flocks` in the config file (or in `GPU_FLOCK` and `BUILD_FLOCK`). The new scripts then also take these files: exclusive for `gpu-turn.sh` and `build-gate.sh quiet`, shared for `build-gate.sh build`. An empty variable turns a flock off. When no old process is left, remove `flocks`.

To replace a script that other agents use now, keep a backup and replace the file with an atomic rename. A script that runs now then continues with its old file:

```sh
cd <scripts directory>
for f in gpu-turn.sh build-gate.sh; do
  [ -e $f.orig ] || cp -a $f $f.orig
  ln -sfn "$REPO/bin/$f" .$f.new && mv -T .$f.new $f
done
```

The new scripts do not read the queue file of the old `gpu-turn.sh`. See [INSTALL.md](INSTALL.md), step 6, to move waiting entries to the new store.

## OpenChamber extension

The directory `openchamber/` is an OpenChamber extension. It shows the state of the store:

- **Rail panel "Resource Queue"**: Each resource, with its used slots, its holders and its queue.
  - A holder shows the holder name, the IRC nick, the purpose, the hold time, the time left until `max_hold_sec`, the ticket, the session and the PIDs.
  - A waiting ticket shows its position, the wait time, its preconditions and the reason why it waits.
  - Badges show problems: `owner dead` (the next check frees the lock), `not seen` (the owner did not see the grant yet), `blocked` (a precondition fails) and `no poll` (the owner did not poll for more than 5 minutes).
  - The panel also shows the available memory, the compilers that run now, the counts and the mean wait and hold times of the last 24 hours, and the last 30 queue events.
- **Work Status section "Resource locks"**: One line for each resource with the holder and the number of waiting tickets.

The extension has a small local service. The service reads the store in read-only mode with the `node:sqlite` module of OpenChamber's Node runtime (Node 22.13 or newer). It does not change the queue. The service finds the store as described in [Configuration](#configuration). OpenChamber does not give its environment to the service, so use the config file, or write the directory in the Store field at the bottom of the panel.

### Install the extension

1. In OpenChamber, open Settings → Extensions, and add the folder `$REPO/openchamber`. Or use the API: `curl -X POST localhost:<port>/api/guests -H 'content-type: application/json' -d '{"path":"<full path of openchamber/>"}'`.
2. Allow the local service of Resource Queue in Settings → Extensions.

The built files `panel/main.js`, `status/main.js` and `service/main.js` are in the repository, because OpenChamber does not build extensions. After you change a file in `openchamber/src/`, build and test again:

```sh
cd openchamber
bun install
bun run build
bun run test
bun run typecheck
```

## Agent skill

`skills/resource-queue/SKILL.md` tells agents how to use the tools and the scripts. Install step 5 links it into the opencode skills directory.

## Tests

```sh
bun test
```

The tests put their stores under `~/.cache/resource-queue-test` (set `RQ_TEST_ROOT` to change it). The store refuses `/tmp`, so do not set `RQ_TEST_ROOT` to a directory there. The tests cover FIFO grants between two sessions and between processes, recovery from a crashed holder in one check interval, preconditions that never pass, capacity, ownership, and many processes that use the store at the same time.
