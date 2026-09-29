"use server";

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { clients, companies, equiUnits, motUnits } from "@/db/schema";
import { assignEquiFolio, assignMotFolio } from "@/lib/folio-format";
import {
  canConfirmMotIngress,
  canCreateEqui,
  canCreateMot,
  canViewEqui,
  canViewMot,
} from "@/lib/permissions-activos";
import { getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

async function getIntercompanySystronClientId(servomotoresCompanyId: string) {
  const db = getDb();
  const rows = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.companyId, servomotoresCompanyId),
        eq(clients.isIntercompany, true),
        eq(clients.active, true),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function listEquiForCompany(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(equiUnits)
    .where(and(eq(equiUnits.companyId, companyId), eq(equiUnits.active, true)))
    .orderBy(desc(equiUnits.createdAt))
    .limit(200);
}

export async function getEqui(companyId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(equiUnits)
    .where(and(eq(equiUnits.id, id), eq(equiUnits.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createEquiAction(formData: FormData) {
  const session = await requireSession();
  if (!canCreateEqui(session)) throw new Error("Sin permiso");
  if (session.activeCompany.code !== "SYSTRON") throw new Error("EQUI solo en SYSTRON");

  const clientId = String(formData.get("clientId") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  if (!clientId || !model) throw new Error("Cliente y modelo son obligatorios");

  const db = getDb();
  const client = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, session.activeCompany.id)))
    .limit(1);
  if (!client[0]) throw new Error("Cliente no válido");

  const folio = await assignEquiFolio(session.activeCompany.id);
  const [row] = await db
    .insert(equiUnits)
    .values({
      companyId: session.activeCompany.id,
      folio,
      clientId,
      equipmentType: String(formData.get("equipmentType") ?? "").trim() || null,
      brand: String(formData.get("brand") ?? "").trim() || null,
      model,
      description: String(formData.get("description") ?? "").trim() || null,
      manufacturerSerial: String(formData.get("manufacturerSerial") ?? "").trim() || null,
      createdByUserId: session.id,
    })
    .returning();

  revalidatePath("/app/equi");
  redirect(`/app/equi/${row.id}`);
}

export async function listMotForSession(session: Awaited<ReturnType<typeof requireSession>>) {
  const db = getDb();
  if (session.activeCompany.code === "SYSTRON") {
    return db
      .select()
      .from(motUnits)
      .where(and(eq(motUnits.originCompanyId, session.activeCompany.id), eq(motUnits.active, true)))
      .orderBy(desc(motUnits.createdAt))
      .limit(200);
  }

  const systronCo = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.code, "SYSTRON"))
    .limit(1);

  const systronId = systronCo[0]?.id;
  return db
    .select()
    .from(motUnits)
    .where(
      and(
        eq(motUnits.active, true),
        or(
          eq(motUnits.originCompanyId, session.activeCompany.id),
          systronId ? eq(motUnits.originCompanyId, systronId) : eq(motUnits.originCompanyId, session.activeCompany.id),
        ),
      ),
    )
    .orderBy(desc(motUnits.createdAt))
    .limit(200);
}

export async function listMotVisible() {
  const session = await requireSession();
  if (!canViewMot(session)) return [];
  return listMotForSession(session);
}

export async function getMot(id: string) {
  const session = await requireSession();
  if (!canViewMot(session)) return null;

  const db = getDb();
  const rows = await db.select().from(motUnits).where(eq(motUnits.id, id)).limit(1);
  const mot = rows[0];
  if (!mot || !mot.active) return null;

  if (session.activeCompany.code === "SYSTRON") {
    return mot.originCompanyId === session.activeCompany.id ? mot : null;
  }

  if (mot.originCompanyId === session.activeCompany.id || mot.originCompanyCode === "SYSTRON") {
    return mot;
  }
  return null;
}

export async function createMotSystronAction(formData: FormData) {
  const session = await requireSession();
  if (!canCreateMot(session) || session.activeCompany.code !== "SYSTRON") {
    throw new Error("Sin permiso");
  }

  const clientId = String(formData.get("clientId") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  if (!clientId || !model) throw new Error("Cliente y modelo obligatorios");

  const db = getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, session.activeCompany.id)))
    .limit(1);
  if (!client) throw new Error("Cliente no válido");

  const [servomotoresCo] = await db
    .select()
    .from(companies)
    .where(eq(companies.code, "SERVOMOTORES"))
    .limit(1);
  if (!servomotoresCo) throw new Error("Empresa Servomotores no configurada");

  const servomotoresClientId = await getIntercompanySystronClientId(servomotoresCo.id);
  if (!servomotoresClientId) throw new Error("Cliente intercompañía SYSTRON en Servomotores no encontrado");

  const folio = await assignMotFolio();
  const [row] = await db
    .insert(motUnits)
    .values({
      folio,
      originCompanyId: session.activeCompany.id,
      originCompanyCode: "SYSTRON",
      systronClientId: clientId,
      servomotoresClientId,
      systronResponsibleUserId: session.id,
      brand: String(formData.get("brand") ?? "").trim() || null,
      model,
      description: String(formData.get("description") ?? "").trim() || null,
      manufacturerSerial: String(formData.get("manufacturerSerial") ?? "").trim() || null,
      custodyStatus: "PENDIENTE_INGRESO_SERVOMOTORES",
      createdByUserId: session.id,
    })
    .returning();

  revalidatePath("/app/mot");
  redirect(`/app/mot/${row.id}`);
}

export async function createMotServomotoresAction(formData: FormData) {
  const session = await requireSession();
  if (!canCreateMot(session) || session.activeCompany.code !== "SERVOMOTORES") {
    throw new Error("Sin permiso");
  }

  const clientId = String(formData.get("clientId") ?? "");
  const model = String(formData.get("model") ?? "").trim();
  if (!clientId || !model) throw new Error("Cliente y modelo obligatorios");

  const db = getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, session.activeCompany.id)))
    .limit(1);
  if (!client || client.isIntercompany) throw new Error("Cliente no válido");

  const folio = await assignMotFolio();
  const [row] = await db
    .insert(motUnits)
    .values({
      folio,
      originCompanyId: session.activeCompany.id,
      originCompanyCode: "SERVOMOTORES",
      servomotoresClientId: clientId,
      brand: String(formData.get("brand") ?? "").trim() || null,
      model,
      description: String(formData.get("description") ?? "").trim() || null,
      manufacturerSerial: String(formData.get("manufacturerSerial") ?? "").trim() || null,
      custodyStatus: "PENDIENTE_INGRESO_SERVOMOTORES",
      createdByUserId: session.id,
    })
    .returning();

  revalidatePath("/app/mot");
  redirect(`/app/mot/${row.id}`);
}

export async function confirmMotIngressAction(formData: FormData) {
  const session = await requireSession();
  if (!canConfirmMotIngress(session)) throw new Error("Sin permiso");

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  if (!id || !version) throw new Error("Datos incompletos");

  const db = getDb();
  const mot = await getMot(id);
  if (!mot) throw new Error("MOT no encontrado");
  if (mot.custodyStatus !== "PENDIENTE_INGRESO_SERVOMOTORES") {
    throw new Error("El MOT no está pendiente de ingreso");
  }

  const updated = await db
    .update(motUnits)
    .set({
      custodyStatus: "EN_RESGUARDO_SERVOMOTORES",
      physicalIngressAt: sql`now()`,
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(and(eq(motUnits.id, id), eq(motUnits.version, version)))
    .returning({ id: motUnits.id });

  if (updated.length === 0) redirect(`/app/mot/${id}?conflict=1`);

  revalidatePath("/app/mot");
  revalidatePath(`/app/mot/${id}`);
}

export async function listClientsForSelect(companyId: string) {
  const db = getDb();
  return db
    .select({ id: clients.id, name: clients.name, isIntercompany: clients.isIntercompany })
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.active, true)))
    .orderBy(asc(clients.name))
    .limit(500);
}

export async function listPendingMotIngress() {
  const session = await requireSession();
  if (!canConfirmMotIngress(session)) return [];

  const db = getDb();
  return db
    .select()
    .from(motUnits)
    .where(
      and(eq(motUnits.active, true), eq(motUnits.custodyStatus, "PENDIENTE_INGRESO_SERVOMOTORES")),
    )
    .orderBy(desc(motUnits.createdAt))
    .limit(100);
}

export { canViewEqui, canCreateEqui, canViewMot, canCreateMot, canConfirmMotIngress };
