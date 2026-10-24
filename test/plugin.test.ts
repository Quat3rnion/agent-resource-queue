import { afterAll, expect, test } from "bun:test"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { Store } from "../src/store.ts"
import { MAX_WAIT_SEC, createTools, sessionDeletedID } from "../src/plugin.ts"

const DIR = join(process.env.RQ_TEST_ROOT ?? "/arboretum/resource-queue-test", `plugin-${process.pid}`)
mkdirSync(DIR, { recursive: true })
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

test("session.deleted events (v2 shape) give the session ID", () => {
  expect(sessionDeletedID({ type: "session.deleted", data: { sessionID: "ses_1" } })).toBe("ses_1")
  expect(sessionDeletedID({ type: "session.deleted", properties: { info: { id: "ses_2" } } })).toBe("ses_2")
  expect(sessionDeletedID({ type: "session.idle", data: { sessionID: "ses_1" } })).toBeNull()
})

test("tools: the session is the owner; another session cannot cancel; wait is capped", async () => {
  const store = new Store({ dir: DIR, checkIntervalMs: 20 })
  const tools = Object.fromEntries(createTools(store).map((t) => [t.name, t as { execute(i: any, c: any): Promise<{ content: string; metadata?: any }> }]))
  const s1 = { sessionID: "ses_1" }
  const s2 = { sessionID: "ses_2" }
  const a = await tools.resource_acquire!.execute({ resource: "gpu", holder: "a", purpose: "p", max_hold_sec: 60 }, s1)
  const b = await tools.resource_acquire!.execute({ resource: "gpu", holder: "b", purpose: "p", max_hold_sec: 60 }, s2)
  expect(a.content).toStartWith("granted")
  expect(b.content).toStartWith("waiting")
  await expect(tools.resource_cancel!.execute({ ticket: a.metadata!.ticket }, s2)).rejects.toThrow(/only its owner/)
  await tools.resource_release!.execute({ ticket: a.metadata!.ticket }, s1)
  const w = await tools.resource_wait!.execute({ ticket: b.metadata!.ticket, timeout_sec: 10_000 }, s2)
  expect(w.content).toStartWith("granted")
  expect(MAX_WAIT_SEC).toBeLessThanOrEqual(600)
  store.close()
})
