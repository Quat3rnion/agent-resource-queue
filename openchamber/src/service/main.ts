// Runs under OpenChamber's Node runtime on 127.0.0.1; only OpenChamber's proxy can reach it.
// GET /snapshot[?dir=/abs/path] reads the resource-queue store (read only) and the host state.
import http from "node:http"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { hostInfo, readSnapshot, type Query } from "./read.ts"
import { defaultDir } from "../../../src/config.ts"
import type { Snapshot } from "../shared/snapshot.ts"

const port = Number(process.env.OPENCHAMBER_SERVICE_PORT)
const token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? ""
if (!port || !token) {
  console.error("OPENCHAMBER_SERVICE_PORT and OPENCHAMBER_SERVICE_TOKEN are required")
  process.exit(1)
}

let open: { dir: string; db: DatabaseSync } | null = null

function close(): void {
  try {
    open?.db.close()
  } catch {}
  open = null
}

function snapshot(dir: string): Snapshot {
  const file = join(dir, "queue.sqlite")
  const empty = (error: string): Snapshot => ({ at: Date.now(), store: { dir, ok: false, error }, host: hostInfo(), resources: [], recent: [] })
  if (!existsSync(file)) {
    close()
    return empty(`No store at ${file}. It is made when an agent first uses a resource.`)
  }
  try {
    if (open?.dir !== dir) {
      close()
      const db = new DatabaseSync(file, { readOnly: true })
      db.exec("PRAGMA busy_timeout = 2000")
      open = { dir, db }
    }
    const db = open.db
    const q: Query = (sql, ...params) => db.prepare(sql).all(...params) as Record<string, unknown>[]
    return readSnapshot(q, dir)
  } catch (e) {
    close() // reopen on the next request
    return empty(`Could not read ${file}: ${(e as Error).message}`)
  }
}

const json = (res: http.ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

const server = http.createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { error: "unauthorized" })
  const url = new URL(req.url ?? "/", "http://127.0.0.1")
  if (url.pathname === "/health") return json(res, 200, { ok: true })
  if (req.method !== "GET" || url.pathname !== "/snapshot") return json(res, 404, { error: "not-found" })
  let dir: string
  try {
    // The same store as the plugin and the CLI: $RESOURCE_QUEUE_DIR is not passed to services, but the config file is read.
    dir = url.searchParams.get("dir") || defaultDir()
  } catch (e) {
    return json(res, 200, { at: Date.now(), store: { dir: "", ok: false, error: (e as Error).message }, host: hostInfo(), resources: [], recent: [] })
  }
  if (!dir.startsWith("/") || dir.includes("..")) return json(res, 400, { error: "bad-dir" })
  json(res, 200, snapshot(dir))
})

const shutdown = (): void => {
  close()
  server.close()
  process.exit(0)
}
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)
server.listen(port, "127.0.0.1")
