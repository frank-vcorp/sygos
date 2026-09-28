import bcrypt from "bcryptjs";
import { getDb } from "./client";
import { companies, userCompanyAccess, users } from "./schema";

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

  return { skipped: false as const };
}

async function main() {
  const result = await seedBase();
  console.log(result.skipped ? "Seed skipped (already initialized)" : "Seed completed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
