# Install resource-queue (instructions for agents)

Follow these steps in order on the host where the agents run. Each step is safe to run again. Do each check. If a check fails, stop and report the output to the operator. Do not continue.

Human readers: see the Install section in `README.md`.

## Variables

Use these values in all steps. If the operator gives other values, use the values of the operator.

```sh
REPO=$HOME/src/agent-resource-queue        # where the repository is
CFG=$HOME/.config/opencode                 # opencode configuration
SCRIPTS=$HOME/.local/bin                   # where gpu-turn.sh and build-gate.sh go (step 6)
SCRATCH=$HOME/.cache/resource-queue-install
```

Do not use `/tmp` for any file. The store refuses `/tmp`. If the operator has a rule for temporary files, put `SCRATCH` there.

## 1. Check the requirements

```sh
uname -s                                                   # must be Linux
bun --version || ~/.bun/bin/bun --version                  # must be 1.1 or newer
opencode --version || ~/.opencode/bin/opencode --version   # must be v2
```

Check: all commands succeed. If `bun` is only in `~/.bun/bin`, use `~/.bun/bin/bun` in the steps below.

## 2. Get the source

If `$REPO` does not exist:

```sh
git clone https://github.com/Quat3rnion/agent-resource-queue.git "$REPO"
```

If the host cannot reach the git server, copy the directory from a host that has it, for example with `rsync -a --exclude node_modules <host>:<path>/ "$REPO/"`.

## 3. Run the tests

```sh
cd "$REPO" && bun test
```

Check: the output has `0 fail`. The tests use `~/.cache/resource-queue-test` and remove it. They do not touch the real store.

## 4. Choose the store directory

All users of the queue on this host must use the same store. Ask the operator if a store exists already, or if the store must be in a special directory. Then:

- If the operator gives a directory, write it to the config file:

  ```sh
  mkdir -p ~/.config/resource-queue
  printf '{ "dir": "%s" }\n' "<directory>" > ~/.config/resource-queue/config.json
  ```

  If the file exists, edit only the `"dir"` value. Keep the other values.
- Else do nothing. The default is `~/.local/state/resource-queue`.

Then put the CLI on PATH and show the values that are used:

```sh
mkdir -p ~/.local/bin && ln -sfn "$REPO/src/cli.ts" ~/.local/bin/resource-queue
resource-queue config
```

Check: `dir` is the directory that you expect. If the shell cannot find `resource-queue`, `~/.local/bin` is not in `PATH`: use `"$REPO/src/cli.ts"` instead of `resource-queue` in the steps below, and tell the operator.

## 5. Install the plugin and the skill

```sh
mkdir -p "$CFG/plugins" "$CFG/skills"
cat > "$CFG/plugins/resource-queue.ts" <<EOF
// resource-queue: shared resource locks with a FIFO wait queue. Source: $REPO
import base from "$REPO/src/plugin.ts"
export default base
EOF
ln -sfn "$REPO/skills/resource-queue" "$CFG/skills/resource-queue"
```

Check: `cat "$CFG/plugins/resource-queue.ts"` shows the full path of `src/plugin.ts`, not a variable name. `head -2 "$CFG/skills/resource-queue/SKILL.md"` shows `name: resource-queue`.

## 6. Install the shell scripts (optional)

Do this step only if the operator wants `gpu-turn.sh` and `build-gate.sh`. Install them as symbolic links, so that they find the CLI in the repository.

If `$SCRIPTS` has old scripts with these names, other agents can use them now. Thus:

- Keep a backup of an old script. Do not overwrite a backup that exists.
- Replace each file with `mv -T`. A running script then continues with its old file. Never write into an existing script file (`cp` over it, `>` or an editor). This can break a script that runs.
- Ask the operator if the old scripts used `flock` files. If yes, write the files in `"flocks"` in `~/.config/resource-queue/config.json`, for example `"flocks": { "gpu": "<gpu lock file>", "build": "<build lock file>" }`. Do this before you replace the scripts. Then old processes and new scripts do not overlap.

```sh
mkdir -p "$SCRIPTS"
for f in gpu-turn.sh build-gate.sh; do
  if [ -f "$SCRIPTS/$f" ] && [ ! -L "$SCRIPTS/$f" ] && [ ! -e "$SCRIPTS/$f.orig" ]; then
    cp -a "$SCRIPTS/$f" "$SCRIPTS/$f.orig"
  fi
  ln -sfn "$REPO/bin/$f" "$SCRIPTS/.$f.new" && mv -T "$SCRIPTS/.$f.new" "$SCRIPTS/$f"
done
```

Check: `readlink -f "$SCRIPTS/gpu-turn.sh"` shows `$REPO/bin/gpu-turn.sh`. `resource-queue config` shows the flocks that you expect, or `null`.

### Old queue entries

An old `gpu-turn.sh` can have a queue file (for example `queue` next to the old script, with one line `<name> <last poll time>` for each waiting agent). The new scripts do not read this file. If the file has entries that were polled in the last 20 minutes, ask the operator if you must carry them over. To carry over one entry, run this command for each name, in the order of the file:

```sh
resource-queue acquire --resource gpu --holder "<name>" --keep --max-hold 1710 --purpose "carried over from old gpu-turn queue"
```

Do not carry over the first entry if its old script runs a command now.

### OpenChamber extension (optional)

Do this only if OpenChamber runs on the host and the operator wants the panel. Find the port of OpenChamber in `~/.config/openchamber/run/*.json`. Then:

```sh
curl -s -X POST "localhost:<port>/api/guests" -H 'content-type: application/json' -d "{\"path\":\"$REPO/openchamber\"}"
```

Check: the answer contains `"id":"resource-queue"`. Do not approve the local service yourself. Tell the operator to allow it in Settings → Extensions.

## 7. Make the plugin active

The opencode server loads plugins when it starts. Other sessions use the server. Do not restart the server yourself. Tell the operator that the plugin is active after the next restart of the opencode server.

## 8. Verify

Make sure that the CLI can use the store:

```sh
resource-queue status
```

Check: the output shows `build (capacity 4)` and `gpu (capacity 1)`, and each one is `free` or has holders. The command makes the store directory if it does not exist.

Make sure that opencode loads the plugin. This command starts a private server, so it does not affect other sessions:

```sh
mkdir -p "$SCRATCH" && cd "$SCRATCH"
TMPDIR="$SCRATCH" opencode run --standalone "Call the resource_status tool (not bash). If it does not exist, say NO-TOOLS. Report its output verbatim."
cd && rm -rf "$SCRATCH"
```

Check: the output is the status text, not `NO-TOOLS`.

## 9. Report

Send one message to the operator, and post it in the project channel if you use agent-comms. Include:

- The host and the commit (`git -C "$REPO" rev-parse --short HEAD`, or "copied" if there is no git).
- The test result.
- The store directory (`resource-queue config`).
- Whether you installed the scripts, which `.orig` backups you made, and which flocks are set.
- Whether you carried over old queue entries.
- That the plugin becomes active at the next restart of the opencode server.
