import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { companies, userCompanyAccess, users } from "./schema";

type Role = (typeof users.$inferSelect)["role"];

type DemoUserSpec = {
  username: string;
  displayName: string;
  role: Role;
  homeCode: "SYSTRON" | "SERVOMOTORES" | null;
  multiCompany: boolean;
};

const DEMO_USERS: DemoUserSpec[] = [
  { username: "ceo", displayName: "CEO prueba", role: "CEO", homeCode: null, multiCompany: true },
  {
    username: "coord",
    displayName: "Coordinación prueba",
    role: "COORDINACION_ADMIN",
    homeCode: null,
    multiCompany: true,
  },
  {
    username: "ger.systron",
    displayName: "Gerente SYSTRON",
    role: "GERENTE_OPERATIVO_SYSTRON",
    homeCode: "SYSTRON",
    multiCompany: false,
  },
  {
    username: "ger.servomotores",
    displayName: "Gerente Servomotores",
    role: "GERENTE_OPERATIVO_SERVOMOTORES",
    homeCode: "SERVOMOTORES",
    multiCompany: false,
  },
  {
    username: "ventas.systron",
    displayName: "Ventas SYSTRON",
    role: "VENTAS_SYSTRON",
    homeCode: "SYSTRON",
    multiCompany: false,
  },
  {
    username: "almacen.systron",
    displayName: "Almacén SYSTRON",
    role: "ALMACEN_SYSTRON",
    homeCode: "SYSTRON",
    multiCompany: false,
  },
  {
    username: "sup.tecnico.systron",
    displayName: "Supervisor técnico SYSTRON",
    role: "SUPERVISOR_TECNICO_SYSTRON",
    homeCode: "SYSTRON",
    multiCompany: false,
  },
  {
    username: "tecnico.systron",
    displayName: "Técnico SYSTRON",
    role: "TECNICO_SYSTRON",
    homeCode: "SYSTRON",
    multiCompany: false,
  },
  {
    username: "kiosco",
    displayName: "Kiosco asistencia",
    role: "KIOSCO_ASISTENCIA",
    homeCode: "SERVOMOTORES",
    multiCompany: false,
  },
];

export async function seedDemoUsers() {
  let password = process.env.SYGOS_DEMO_USERS_PASSWORD?.trim() ?? "";
  if (password.startsWith("'") && password.endsWith("'")) {
    password = password.slice(1, -1);
  }
  if (!password) {
    return { skipped: true as const, reason: "SYGOS_DEMO_USERS_PASSWORD not set" };
  }

  const db = getDb();
  const companyRows = await db.select().from(companies);
  if (companyRows.length === 0) {
    return { skipped: true as const, reason: "companies missing" };
  }

  const byCode = Object.fromEntries(companyRows.map((c) => [c.code, c])) as Record<
    "SYSTRON" | "SERVOMOTORES",
    (typeof companyRows)[0]
  >;

  const passwordHash = await bcrypt.hash(password, 12);
  let created = 0;
  let updated = 0;

  for (const spec of DEMO_USERS) {
    const homeCompanyId = spec.homeCode ? byCode[spec.homeCode].id : null;
    const existing = await db.select().from(users).where(eq(users.username, spec.username)).limit(1);
    let userId: string;

    if (existing[0]) {
      userId = existing[0].id;
      await db
        .update(users)
        .set({ passwordHash, role: spec.role, displayName: spec.displayName, homeCompanyId, active: true })
        .where(eq(users.id, userId));
      updated += 1;
    } else {
      const [row] = await db
        .insert(users)
        .values({
          username: spec.username,
          displayName: spec.displayName,
          passwordHash,
          role: spec.role,
          homeCompanyId,
        })
        .returning();
      userId = row.id;
      created += 1;
    }

    if (spec.multiCompany) {
      for (const company of companyRows) {
        await db
          .insert(userCompanyAccess)
          .values({ userId, companyId: company.id })
          .onConflictDoNothing({ target: [userCompanyAccess.userId, userCompanyAccess.companyId] });
      }
    }
  }

  return { skipped: false as const, created, updated };
}
