import { createHash, randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { sessions, users, companies } from "@/db/schema";
import { getCompaniesForUser, getUserHomeCompany, userCanAccessCompany } from "@/lib/users";
import {
  clearViewAsUserId,
  readViewAsUserId,
  validateViewAsTarget,
} from "@/lib/impersonation";

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
  /** Usuario real (admin) cuando hay suplantación activa */
  impersonator?: {
    id: string;
    username: string;
    displayName: string;
  };
};

type SessionRow = {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  role: (typeof users.$inferSelect)["role"];
  activeCompanyId: string;
  companyCode: (typeof companies.$inferSelect)["code"];
  companyDisplayName: string;
};

async function loadSessionRow(): Promise<SessionRow | null> {
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
  if (!row?.userId) return null;
  return row as SessionRow;
}

async function buildSessionUser(
  row: SessionRow,
  impersonator?: SessionUser["impersonator"],
): Promise<SessionUser> {
  const multi = await getCompaniesForUser(row.userId);
  const home = await getUserHomeCompany(row.userId);
  const allowedCompanies =
    multi.length > 0
      ? multi.map((c) => ({ id: c.id, code: c.code, displayName: c.displayName }))
      : home
        ? [{ id: home.id, code: home.code, displayName: home.displayName }]
        : [];

  let activeCompanyId = row.activeCompanyId;
  let companyCode = row.companyCode;
  let companyDisplayName = row.companyDisplayName;

  const activeAllowed = allowedCompanies.find((c) => c.id === activeCompanyId);
  if (!activeAllowed) {
    const fallback =
      allowedCompanies[0] ??
      (home ? { id: home.id, code: home.code, displayName: home.displayName } : null);
    if (fallback) {
      activeCompanyId = fallback.id;
      companyCode = fallback.code as (typeof companies.$inferSelect)["code"];
      companyDisplayName = fallback.displayName;
    }
  } else {
    companyCode = activeAllowed.code as (typeof companies.$inferSelect)["code"];
    companyDisplayName = activeAllowed.displayName;
  }

  return {
    id: row.userId,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    activeCompany: {
      id: activeCompanyId,
      code: companyCode,
      displayName: companyDisplayName,
    },
    allowedCompanies,
    impersonator,
  };
}

/** Sesión del usuario autenticado (sin suplantación). */
export async function getRealSession(): Promise<SessionUser | null> {
  const row = await loadSessionRow();
  if (!row) return null;
  return buildSessionUser(row);
}

export async function getSession(): Promise<SessionUser | null> {
  const row = await loadSessionRow();
  if (!row) return null;

  const real = await buildSessionUser(row);
  if (real.role !== "ADMINISTRADOR") {
    return real;
  }

  const viewAsId = await readViewAsUserId();
  if (!viewAsId || viewAsId === real.id) {
    return real;
  }

  const target = await validateViewAsTarget(viewAsId);
  if (!target) {
    await clearViewAsUserId();
    return real;
  }

  const impersonatedRow: SessionRow = {
    sessionId: row.sessionId,
    userId: target.id,
    username: target.username,
    displayName: target.displayName,
    role: target.role,
    activeCompanyId: row.activeCompanyId,
    companyCode: row.companyCode,
    companyDisplayName: row.companyDisplayName,
  };

  const effective = await buildSessionUser(impersonatedRow, {
    id: real.id,
    username: real.username,
    displayName: real.displayName,
  });

  return effective;
}

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
  await clearViewAsUserId();
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
