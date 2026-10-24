// Builds the three committed bundles. OpenChamber installs extensions without building them,
// so panel/main.js, status/main.js and service/main.js are checked in.
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const targets = [
  // Sandboxed iframes cannot load ES modules: one classic IIFE each.
  { entry: "src/panel/main.ts", out: "panel/main.js", node: false },
  { entry: "src/status/main.ts", out: "status/main.js", node: false },
  // The service runs under OpenChamber's Node runtime; built-ins stay external.
  { entry: "src/service/main.ts", out: "service/main.js", node: true },
]

for (const t of targets) {
  const result = await Bun.build({ entrypoints: [resolve(t.entry)], format: t.node ? "esm" : "iife", target: t.node ? "node" : "browser", minify: !t.node })
  const artifact = result.outputs[0]
  if (!result.success || !artifact) {
    console.error(result.logs.map((l) => l.message).join("\n") || `Build failed: ${t.entry}`)
    process.exit(1)
  }
  await writeFile(resolve(t.out), await artifact.text())
  console.log(`${t.out}  ${(artifact.size / 1024).toFixed(1)} KB`)
}
