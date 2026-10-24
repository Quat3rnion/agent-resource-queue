// Where tests put their stores: $RQ_TEST_ROOT, else ~/.cache/resource-queue-test. Never /tmp (the store refuses it).
import { homedir } from "node:os"
import { join } from "node:path"
export const TEST_ROOT = process.env.RQ_TEST_ROOT || join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "resource-queue-test")
