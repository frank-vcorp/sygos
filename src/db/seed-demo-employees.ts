import { and, eq } from "drizzle-orm";
import { getDb } from "./client";
import { companies, employees, salaryHistoryEntries, users } from "./schema";

export async function seedDemoEmployees() {
  if (process.env.SYGOS_SEED_DEMO_USERS !== "1") {
    return { skipped: true as const, reason: "SYGOS_SEED_DEMO_USERS not set" };
  }
  const db = getDb();
  const [sm] = await db.select().from(companies).where(eq(companies.code, "SERVOMOTORES")).limit(1);
  if (!sm) return { skipped: true as const, reason: "no servomotores" };

  const [ceo] = await db.select().from(users).where(eq(users.username, "ceo")).limit(1);
  const [gerSm] = await db.select().from(users).where(eq(users.username, "ger.servomotores")).limit(1);
  let ayudante = (await db.select().from(users).where(eq(users.username, "ayudante.sm")).limit(1))[0];
  if (!ayudante && process.env.SYGOS_DEMO_USERS_PASSWORD) {
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.hash(process.env.SYGOS_DEMO_USERS_PASSWORD, 12);
    const [row] = await db
      .insert(users)
      .values({
        username: "ayudante.sm",
        displayName: "Ayudante General SM",
        role: "AYUDANTE_GENERAL_SERVOMOTORES",
        passwordHash,
        homeCompanyId: sm.id,
      })
      .returning();
    ayudante = row;
  }

  const specs = [
    {
      employeeNumber: "GER-SM-01",
      fullName: "Gerente Operativo Servomotores",
      userId: gerSm?.id,
      managerId: null as string | null,
      fixedSalaryOnly: true,
      kioskEligible: false,
      stamped: 40000,
      cash: 0,
    },
    {
      employeeNumber: "AYU-SM-01",
      fullName: "Ayudante General",
      userId: ayudante?.id,
      managerId: null as string | null,
      fixedSalaryOnly: false,
      kioskEligible: true,
      stamped: 8000,
      cash: 2000,
    },
  ];

  let upserted = 0;
  for (const s of specs) {
    const existing = await db
      .select()
      .from(employees)
      .where(and(eq(employees.companyId, sm.id), eq(employees.employeeNumber, s.employeeNumber)))
      .limit(1);
    let empId: string;
    if (existing[0]) {
      empId = existing[0].id;
      await db
        .update(employees)
        .set({
          userId: s.userId,
          fixedSalaryOnly: s.fixedSalaryOnly,
          kioskEligible: s.kioskEligible,
          salaryStampedMxn: s.stamped,
          salaryCashMxn: s.cash,
        })
        .where(eq(employees.id, empId));
    } else {
      const [emp] = await db
        .insert(employees)
        .values({
          companyId: sm.id,
          employeeNumber: s.employeeNumber,
          fullName: s.fullName,
          userId: s.userId,
          fixedSalaryOnly: s.fixedSalaryOnly,
          kioskEligible: s.kioskEligible,
          salaryStampedMxn: s.stamped,
          salaryCashMxn: s.cash,
        })
        .returning();
      empId = emp.id;
      await db.insert(salaryHistoryEntries).values({
        employeeId: empId,
        stampedMxn: s.stamped,
        cashMxn: s.cash,
      });
    }
    upserted++;
  }

  const [gerEmp] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.companyId, sm.id), eq(employees.employeeNumber, "GER-SM-01")))
    .limit(1);
  const [ayuEmp] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.companyId, sm.id), eq(employees.employeeNumber, "AYU-SM-01")))
    .limit(1);
  if (gerEmp && ayuEmp) {
    await db.update(employees).set({ managerId: gerEmp.id }).where(eq(employees.id, ayuEmp.id));
    if (ceo) {
      await db.update(employees).set({ managerId: null }).where(eq(employees.id, gerEmp.id));
    }
  }

  return { skipped: false as const, upserted };
}
