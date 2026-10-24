// src/service/main.ts
import http from "node:http";
import { existsSync } from "node:fs";
import { join as join2 } from "node:path";
import { DatabaseSync } from "node:sqlite";

// src/service/read.ts
import { hostname as hostname2 } from "node:os";
import { readFileSync as readFileSync2 } from "node:fs";

// ../src/proc.ts
import { readFileSync, readdirSync } from "node:fs";
import { hostname } from "node:os";
var HOST = hostname();
function pidStartTime(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    return rest[19] ?? null;
  } catch {
    return null;
  }
}
function processAlive(pid, startTime) {
  const now = pidStartTime(pid);
  if (now === null)
    return false;
  return startTime === null || now === startTime;
}
function processNames() {
  const names = [];
  let entries;
  try {
    entries = readdirSync("/proc");
  } catch {
    return names;
  }
  for (const e of entries) {
    if (!/^\d+$/.test(e))
      continue;
    try {
      names.push(readFileSync(`/proc/${e}/comm`, "utf8").trim());
    } catch {}
  }
  return names;
}
function baseProcessName(comm) {
  const n = comm.replace(/-\d+(\.\d+)*$/, "");
  const m = /^(?:[a-z0-9_]+-){2,4}(gcc|g\+\+|cc|c\+\+|as|ld(?:\.[a-z]+)?|clang(?:\+\+)?)$/.exec(n);
  return m ? m[1] : n;
}
function nameMatches(comm, names) {
  const base = baseProcessName(comm);
  for (const n of names)
    if (n === comm || n === base)
      return true;
  return false;
}
var COMPILERS = [
  "hipcc",
  "nvcc",
  "rustc",
  "clang",
  "clang++",
  "clang-offload-b",
  "cc1",
  "cc1plus",
  "cc1obj",
  "cc",
  "c++",
  "gcc",
  "g++",
  "collect2",
  "as",
  "ld",
  "ld.lld",
  "ld.bfd",
  "ld.gold",
  "ld.mold",
  "lld",
  "mold"
];
function runningCompilers(names = processNames()) {
  const counts = new Map;
  for (const n of names)
    if (nameMatches(n, COMPILERS))
      counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n, c]) => c > 1 ? `${n} x${c}` : n);
}
function memAvailableKb() {
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(readFileSync("/proc/meminfo", "utf8"));
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
function ownersDead(t) {
  const procs = [];
  if (t.owner_pid !== null)
    procs.push([t.owner_pid, t.owner_start]);
  if (t.run_pid !== null)
    procs.push([t.run_pid, t.run_start]);
  return procs.length > 0 && procs.every(([pid, start]) => !processAlive(pid, start));
}

// src/shared/snapshot.ts
var STATS_WINDOW_SEC = 24 * 3600;

// src/service/read.ts
var sec = (ms) => Math.max(0, Math.round(ms / 1000));
function alive(t) {
  if (t.host !== HOST || t.owner_pid === null && t.run_pid === null)
    return null;
  return !ownersDead(t);
}
function describePrecondition(p) {
  const hold = typeof p.for_sec === "number" && p.for_sec > 0 ? ` for ${p.for_sec} s` : "";
  if (p.kind === "mem_available")
    return `MemAvailable >= ${Math.round(Number(p.min_kb) / 1024 / 1024 * 10) / 10} GB${hold}`;
  if (p.kind === "no_process")
    return `no ${p.names.join(", ")}${hold}`;
  if (p.kind === "no_compiler")
    return `no compiler${hold}`;
  return JSON.stringify(p);
}
function memTotalKb() {
  try {
    const m = /^MemTotal:\s+(\d+)\s+kB/m.exec(readFileSync2("/proc/meminfo", "utf8"));
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}
function hostInfo() {
  return { name: hostname2(), memAvailableKb: memAvailableKb(), memTotalKb: memTotalKb(), compilers: runningCompilers() };
}
function readSnapshot(q, dir, now = Date.now(), host = hostInfo()) {
  const caps = new Map(q("SELECT name, capacity FROM resources").map((r) => [r.name, r.capacity]));
  const active = q("SELECT * FROM tickets WHERE state IN ('waiting','held') ORDER BY seq");
  const since = now - STATS_WINDOW_SEC * 1000;
  const names = [...new Set([...caps.keys(), ...active.map((t) => t.resource)])].sort();
  const resources = names.map((name) => {
    const capacity = caps.get(name) ?? 1;
    const mine = active.filter((t) => t.resource === name);
    const holders = mine.filter((t) => t.state === "held").map((t) => {
      const granted = t.granted_at ?? now;
      return {
        ticket: t.id,
        holder: t.holder,
        nick: t.nick,
        session: t.session_id,
        purpose: t.purpose,
        exclusive: !!t.exclusive,
        backfill: !!t.backfill,
        heldSec: sec(now - granted),
        maxHoldSec: t.max_hold_sec,
        leftSec: sec(granted + t.max_hold_sec * 1000 - now),
        claimed: !!t.claimed,
        alive: alive(t),
        pids: [t.owner_pid, t.run_pid].filter((p) => p !== null)
      };
    });
    const queue = mine.filter((t) => t.state === "waiting").map((t, i) => {
      let pre = [];
      try {
        pre = JSON.parse(t.preconditions).map(describePrecondition);
      } catch {}
      return {
        position: i + 1,
        ticket: t.id,
        holder: t.holder,
        nick: t.nick,
        session: t.session_id,
        purpose: t.purpose,
        exclusive: !!t.exclusive,
        waitedSec: sec(now - t.created_at),
        lastPollSec: sec(now - t.last_seen),
        pendingReason: t.pending_reason,
        preconditions: pre,
        alive: alive(t)
      };
    });
    const used = Math.min(capacity, holders.reduce((s, h) => s + (h.exclusive ? capacity : 1), 0));
    const ev = q("SELECT event, duration_ms FROM events WHERE resource = ? AND at >= ? AND event != 'enqueue'", name, since);
    const waits = ev.filter((e) => e.event === "granted" && e.duration_ms !== null).map((e) => e.duration_ms);
    const holds = ev.filter((e) => e.event.endsWith("(held)") && e.duration_ms !== null).map((e) => e.duration_ms);
    const mean = (a) => a.length ? sec(a.reduce((s, v) => s + v, 0) / a.length) : null;
    return {
      name,
      capacity,
      used,
      holders,
      queue,
      stats: {
        grants: waits.length,
        meanWaitSec: mean(waits),
        maxWaitSec: waits.length ? sec(Math.max(...waits)) : null,
        meanHoldSec: mean(holds),
        expired: ev.filter((e) => e.event.startsWith("expired")).length,
        canceled: ev.filter((e) => e.event.startsWith("canceled")).length
      }
    };
  });
  const recent = q("SELECT * FROM events WHERE event != 'enqueue' ORDER BY id DESC LIMIT 30").map((e) => ({
    at: e.at,
    resource: e.resource,
    event: e.event,
    ticket: e.ticket,
    holder: e.holder,
    nick: e.nick ?? null,
    purpose: e.purpose ?? null,
    durationSec: e.duration_ms === null ? null : sec(e.duration_ms),
    detail: e.detail ?? null
  }));
  return { at: now, store: { dir, ok: true, error: null }, host, resources, recent };
}

// ../src/config.ts
import { readFileSync as readFileSync3 } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
var home = () => process.env.HOME || homedir();
var expand = (p) => p === "~" ? home() : p.startsWith("~/") ? join(home(), p.slice(2)) : resolve(p);
function configPath() {
  return join(process.env.XDG_CONFIG_HOME || join(home(), ".config"), "resource-queue", "config.json");
}
function loadConfig(path = configPath()) {
  let raw;
  try {
    raw = JSON.parse(readFileSync3(path, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT")
      return {};
    throw new Error(`resource-queue: cannot read ${path}: ${e.message}`);
  }
  const c = raw ?? {};
  const f = c.flocks ?? {};
  const str = (v) => typeof v === "string" && v.trim() ? expand(v.trim()) : undefined;
  return { dir: str(c.dir), flocks: { gpu: str(f.gpu), build: str(f.build) } };
}
function defaultDir(config = loadConfig()) {
  const env = process.env.RESOURCE_QUEUE_DIR?.trim();
  if (env)
    return expand(env);
  if (config.dir)
    return config.dir;
  return join(process.env.XDG_STATE_HOME || join(home(), ".local", "state"), "resource-queue");
}

// src/service/main.ts
var port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
var token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
if (!port || !token) {
  console.error("OPENCHAMBER_SERVICE_PORT and OPENCHAMBER_SERVICE_TOKEN are required");
  process.exit(1);
}
var open = null;
function close() {
  try {
    open?.db.close();
  } catch {}
  open = null;
}
function snapshot(dir) {
  const file = join2(dir, "queue.sqlite");
  const empty = (error) => ({ at: Date.now(), store: { dir, ok: false, error }, host: hostInfo(), resources: [], recent: [] });
  if (!existsSync(file)) {
    close();
    return empty(`No store at ${file}. It is made when an agent first uses a resource.`);
  }
  try {
    if (open?.dir !== dir) {
      close();
      const db = new DatabaseSync(file, { readOnly: true });
      db.exec("PRAGMA busy_timeout = 2000");
      open = { dir, db };
    }
    const db = open.db;
    const q = (sql, ...params) => db.prepare(sql).all(...params);
    return readSnapshot(q, dir);
  } catch (e) {
    close();
    return empty(`Could not read ${file}: ${e.message}`);
  }
}
var json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
var server = http.createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`)
    return json(res, 401, { error: "unauthorized" });
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/health")
    return json(res, 200, { ok: true });
  if (req.method !== "GET" || url.pathname !== "/snapshot")
    return json(res, 404, { error: "not-found" });
  let dir;
  try {
    dir = url.searchParams.get("dir") || defaultDir();
  } catch (e) {
    return json(res, 200, { at: Date.now(), store: { dir: "", ok: false, error: e.message }, host: hostInfo(), resources: [], recent: [] });
  }
  if (!dir.startsWith("/") || dir.includes(".."))
    return json(res, 400, { error: "bad-dir" });
  json(res, 200, snapshot(dir));
});
var shutdown = () => {
  close();
  server.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
server.listen(port, "127.0.0.1");
