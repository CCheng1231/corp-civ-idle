/** Re-apply canonical v5 clock layout (alias for sync). */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const r = spawnSync("npx", ["tsx", resolve(__dirname, "sync-z1-v5-hub-layout.mjs")], {
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
