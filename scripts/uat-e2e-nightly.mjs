/**
 * Suite nocturna: recorridos 1–3 + smoke por rol.
 */
import { spawnSync } from "child_process";

const steps = [
  { name: "Recorrido 1 EQUI", cmd: "npm", args: ["run", "uat:e2e:r1"] },
  { name: "Recorrido 2 MOT SM", cmd: "npm", args: ["run", "uat:e2e:r2"] },
  { name: "Recorrido 3 MOT interco", cmd: "npm", args: ["run", "uat:e2e:r3"] },
  { name: "UAT rol tronco", cmd: "npm", args: ["run", "uat:rol"] },
];

let failed = 0;
for (const s of steps) {
  console.log(`\n========== ${s.name} ==========\n`);
  const r = spawnSync(s.cmd, s.args, { stdio: "inherit", env: process.env, cwd: process.cwd() });
  if (r.status !== 0) {
    failed += 1;
    console.error(`\n❌ ${s.name} exit ${r.status ?? "?"}\n`);
  }
}
console.log(`\n=== Nightly: ${steps.length - failed}/${steps.length} suites OK ===\n`);
process.exit(failed ? 2 : 0);
