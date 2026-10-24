# Install resource-queue (instructions for agents)

Follow these steps in order on the host where the agents run. Each step is safe to run again. Do each check. If a check fails, stop and report the output to the operator. Do not continue.

Human readers: see the Install section in `README.md`.

## Variables

Use these values in all steps. Change them only if the operator tells you to.

```sh
REPO=$HOME/Projects/agent-resource-guarding
CFG=$HOME/.config/opencode
STORE=/arboretum/resource-queue
SCRIPTS=/arboretum/gpu-queue
```

Do not use `/tmp` for any file. Put temporary files under `/arboretum`.

## 1. Check the requirements

```sh
uname -s                         # must be Linux
bun --version || ~/.bun/bin/bun --version   # must be 1.1 or newer
opencode --version || ~/.opencode/bin/opencode --version   # must be v2
command -v flock jq
test -d /arboretum && test -w /arboretum && echo arboretum-ok
```

Check: all commands succeed and the last line is `arboretum-ok`. If `bun` is only in `~/.bun/bin`, use `~/.bun/bin/bun` in the steps below.

## 2. Get the source

If `$REPO` does not exist:

```sh
git clone git@git.lumina.software:quaternion/agent-resource-guarding.git "$REPO"
```

If the host has no access to the git server, copy the directory from a host that has it, for example with `rsync -a --exclude node_modules <host>:Projects/agent-resource-guarding/ "$REPO/"`.

## 3. Run the tests

```sh
mkdir -p /arboretum/resource-queue-test
cd "$REPO" && TMPDIR=/arboretum/resource-queue-test bun test
rm -rf /arboretum/resource-queue-test
```

Check: the output has `0 fail`. The tests do not touch `$STORE` or `$SCRIPTS`.

## 4. Install the plugin

```sh
mkdir -p "$CFG/plugins"
cat > "$CFG/plugins/resource-queue.ts" <<EOF
// resource-queue: shared resource locks with a FIFO wait queue. Source: $REPO
import base from "$REPO/src/plugin.ts"
export default base
EOF
```

Check: `cat "$CFG/plugins/resource-queue.ts"` shows the full path of `src/plugin.ts`, not a variable name.

## 5. Install the skill

```sh
mkdir -p "$CFG/skills"
ln -sfn "$REPO/skills/resource-queue" "$CFG/skills/resource-queue"
```

Check: `head -2 "$CFG/skills/resource-queue/SKILL.md"` shows `name: resource-queue`.

## 6. Install the shell scripts

Do this step only if the operator wants `gpu-turn.sh` and `build-gate.sh` in `$SCRIPTS`. Other agents can use these scripts now. Thus:

- Keep a backup of an old script. Do not overwrite a backup that exists.
- Replace each file with `mv`. A running script then continues with its old file. Never write into an existing script file (`cp` over it, `>` or an editor). This can break a script that runs.

```sh
mkdir -p "$SCRIPTS"
for f in gpu-turn.sh build-gate.sh; do
  if [ -f "$SCRIPTS/$f" ] && [ ! -e "$SCRIPTS/$f.orig" ] && ! grep -q resource-queue "$SCRIPTS/$f"; then
    cp -a "$SCRIPTS/$f" "$SCRIPTS/$f.orig"
  fi
  install -m 775 "$REPO/bin/$f" "$SCRIPTS/.$f.new" && mv -f "$SCRIPTS/.$f.new" "$SCRIPTS/$f"
done
```

The scripts find the CLI at `~/Projects/agent-resource-guarding/src/cli.ts`. If `$REPO` is at a different path, tell the operator: the agents must set `RESOURCE_QUEUE_CLI=$REPO/src/cli.ts`.

Check: `grep -c resource-queue "$SCRIPTS/gpu-turn.sh" "$SCRIPTS/build-gate.sh"` shows a number above 0 for each file.

### Old queue entries

The old `gpu-turn.sh` kept its queue in `$SCRIPTS/queue`. The new scripts do not read this file. If the file has entries that were polled in the last 20 minutes, ask the operator if you must carry them over. To carry over one entry, run this command for each name, in the order of the file:

```sh
bun "$REPO/src/cli.ts" acquire --resource gpu --holder "<name>" --keep --max-hold 1710 --purpose "carried over from old gpu-turn queue"
```

Do not carry over the first entry if its old `gpu-turn.sh` runs a command now (`pgrep -f rdna-gpu-tests.lock`).

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
bun "$REPO/src/cli.ts" status
```

Check: the output shows `build (capacity 4)` and `gpu (capacity 1)`, and each one is `free` or has holders. The command makes `$STORE` if it does not exist.

Make sure that opencode loads the plugin. This command starts a private server, so it does not affect other sessions:

```sh
mkdir -p /arboretum/rq-install && cd /arboretum/rq-install
TMPDIR=/arboretum/rq-install opencode run --standalone "Call the resource_status tool (not bash). If it does not exist, say NO-TOOLS. Report its output verbatim."
cd && rm -rf /arboretum/rq-install
```

Check: the output is the status text, not `NO-TOOLS`.

## 9. Report

Send one message to the operator, and post it in the project channel if you use agent-comms. Include:

- The host and the commit (`git -C "$REPO" rev-parse --short HEAD`, or "copied" if there is no git).
- The test result.
- Whether you installed the scripts, and which `.orig` backups you made.
- Whether you carried over old queue entries.
- That the plugin becomes active at the next restart of the opencode server.
