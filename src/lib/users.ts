import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, userCompanyAccess, users } from "@/db/schema";

export async function findUserByUsername(username: string) {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return rows[0] ?? null;
}

export async function getCompaniesForUser(userId: string) {
  const db = getDb();
  return db
    .select({
      id: companies.id,
      code: companies.code,
      displayName: companies.displayName,
    })
    .from(userCompanyAccess)
    .innerJoin(companies, eq(companies.id, userCompanyAccess.companyId))
    .where(eq(userCompanyAccess.userId, userId));
}

export async function getUserHomeCompany(userId: string) {
  const db = getDb();
  const row = await db
    .select({
      id: companies.id,
      code: companies.code,
      displayName: companies.displayName,
    })
    .from(users)
    .innerJoin(companies, eq(companies.id, users.homeCompanyId))
    .where(eq(users.id, userId))
    .limit(1);
  return row[0] ?? null;
}

export async function userCanAccessCompany(userId: string, companyId: string) {
  const multi = await getCompaniesForUser(userId);
  if (multi.some((c) => c.id === companyId)) return true;
  const home = await getUserHomeCompany(userId);
  return home?.id === companyId;
}
