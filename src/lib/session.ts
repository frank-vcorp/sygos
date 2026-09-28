import { createHash, randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { sessions, users, companies } from "@/db/schema";
import { getCompaniesForUser, getUserHomeCompany, userCanAccessCompany } from "@/lib/users";

export const SESSION_COOKIE = "sygos_session";
const SESSION_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: (typeof users.$inferSelect)["role"];
  activeCompany: {
    id: string;
    code: (typeof companies.$inferSelect)["code"];
    displayName: string;
  };
  allowedCompanies: { id: string; code: string; displayName: string }[];
};

export async function createSession(userId: string, activeCompanyId: string) {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    activeCompanyId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const now = new Date();
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      activeCompanyId: sessions.activeCompanyId,
      companyCode: companies.code,
      companyDisplayName: companies.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(companies, eq(companies.id, sessions.activeCompanyId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.userId) return null;

  const multi = await getCompaniesForUser(row.userId);
  const home = await getUserHomeCompany(row.userId);
  const allowedCompanies =
    multi.length > 0
      ? multi.map((c) => ({ id: c.id, code: c.code, displayName: c.displayName }))
      : home
        ? [{ id: home.id, code: home.code, displayName: home.displayName }]
        : [];

  return {
    id: row.userId,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    activeCompany: {
      id: row.activeCompanyId,
      code: row.companyCode,
      displayName: row.companyDisplayName,
    },
    allowedCompanies,
  };
}

export async function switchActiveCompany(userId: string, companyId: string) {
  const ok = await userCanAccessCompany(userId, companyId);
  if (!ok) throw new Error("Empresa no permitida");

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) throw new Error("Sin sesión");

  const db = getDb();
  await db
    .update(sessions)
    .set({ activeCompanyId: companyId })
    .where(eq(sessions.tokenHash, hashToken(token)));
}

export async function resolveDefaultCompanyId(userId: string) {
  const multi = await getCompaniesForUser(userId);
  if (multi.length > 0) return multi[0].id;
  const home = await getUserHomeCompany(userId);
  if (home) return home.id;
  throw new Error("Usuario sin empresa asignada");
}
