import bcrypt from "bcryptjs";
import { getDb } from "./client";
import { clients, companies, companySettings, integrationSettings, suppliers, userCompanyAccess, users } from "./schema";
import { seedDemoUsers } from "./seed-demo-users";
import { seedDemoEmployees } from "./seed-demo-employees";

export async function seedBase() {
  const db = getDb();
  const existing = await db.select({ id: companies.id }).from(companies).limit(1);
  if (existing.length > 0) {
    return { skipped: true as const };
  }

  const initialPassword = process.env.SYGOS_VECTORIA_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error(
      "SYGOS_VECTORIA_INITIAL_PASSWORD must be set for first seed (Coolify secret, not in repo)",
    );
  }

  const [systron] = await db
    .insert(companies)
    .values({
      code: "SYSTRON",
      legalName: "SYSTRON",
      displayName: "SYSTRON",
    })
    .returning();

  const [servomotores] = await db
    .insert(companies)
    .values({
      code: "SERVOMOTORES",
      legalName: "SYSTRON Servomotores",
      displayName: "Servomotores",
    })
    .returning();

  const passwordHash = await bcrypt.hash(initialPassword, 12);

  const [vectoria] = await db
    .insert(users)
    .values({
      username: "Vectoria",
      displayName: "Vectoria",
      passwordHash,
      role: "ADMINISTRADOR",
      homeCompanyId: null,
    })
    .returning();

  for (const company of [systron, servomotores]) {
    await db.insert(userCompanyAccess).values({
      userId: vectoria.id,
      companyId: company.id,
    });
  }

  await db.insert(clients).values({
    companyId: servomotores.id,
    name: "SYSTRON",
    isIntercompany: true,
    requiresInvoice: true,
    responsibleUserId: vectoria.id,
  });

  await db.insert(suppliers).values({
    companyId: systron.id,
    name: "Servomotores",
    isIntercompany: true,
    emitsFiscalInvoice: true,
  });

  for (const company of [systron, servomotores]) {
    for (const integration of ["FACTURAPI", "SENDGRID", "WHATSAPP"] as const) {
      await db.insert(integrationSettings).values({
        companyId: company.id,
        integration,
        configured: false,
      });
    }
    await db.insert(companySettings).values({ companyId: company.id });
  }

  return { skipped: false as const };
}

async function main() {
  const base = await seedBase();
  console.log(base.skipped ? "Seed skipped (already initialized)" : "Seed completed");
  if (process.env.SYGOS_SEED_DEMO_USERS === "1") {
    const demo = await seedDemoUsers();
    if (demo.skipped) {
      console.log(`Demo users skipped: ${demo.reason}`);
    } else {
      console.log(`Demo users: created=${demo.created} updated=${demo.updated}`);
    }
    const emp = await seedDemoEmployees();
    if (!emp.skipped) console.log(`Demo employees upserted=${emp.upserted}`);
  } else {
    console.log("Demo users skipped: set SYGOS_SEED_DEMO_USERS=1 to create staging demo accounts");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
