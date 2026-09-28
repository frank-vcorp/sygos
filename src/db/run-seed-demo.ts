import { seedDemoUsers } from "./seed-demo-users";

async function main() {
  const result = await seedDemoUsers();
  if (result.skipped) {
    console.log(`Demo users skipped: ${result.reason}`);
    process.exit(result.reason === "SYGOS_DEMO_USERS_PASSWORD not set" ? 1 : 0);
  }
  console.log(`Demo users: created=${result.created} updated=${result.updated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
