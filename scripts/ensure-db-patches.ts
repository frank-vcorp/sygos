import { ensureDbPatches } from "../src/db/ensure-patches";

async function main() {
  await ensureDbPatches();
  console.log("[sygos] ensure-db-patches: OK");
}

main().catch((err) => {
  console.error("[sygos] ensure-db-patches failed:", err);
  process.exit(1);
});
