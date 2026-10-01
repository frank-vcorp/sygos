"use server";

import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { attendances, clients, companies, equiUnits, motUnits, quotes } from "@/db/schema";
import {
  addBusinessDays,
  DEFAULT_INGRESS_SLA_DAYS,
  logMotCustodyEvent,
  listMotCustodyEvents,
} from "@/lib/custody-events";
import { assignEquiFolio, assignMotFolio } from "@/lib/folio-format";
import {
  canConfirmMotIngress,
  canCreateEqui,
  canCreateMot,
  canViewEqui,
  canViewMot,
} from "@/lib/permissions-activos";
import { revalidateCommercialHub } from "@/lib/revalidate-commercial-hub";
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

export async function listEquiWithClients(companyId: string) {
  const db = getDb();
  return db
    .select({
      equi: equiUnits,
      clientName: clients.name,
    })
    .from(equiUnits)
    .innerJoin(clients, eq(equiUnits.clientId, clients.id))
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

export async function getEquiDetail(companyId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      equi: equiUnits,
      clientName: clients.name,
    })
    .from(equiUnits)
    .innerJoin(clients, eq(equiUnits.clientId, clients.id))
    .where(and(eq(equiUnits.id, id), eq(equiUnits.companyId, companyId)))
    .limit(1);
  if (!row) return null;
  return { ...row.equi, clientName: row.clientName };
}

export async function listAttendancesForEqui(equiId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(attendances)
    .where(
      and(eq(attendances.equiId, equiId), eq(attendances.companyId, companyId), eq(attendances.active, true)),
    )
    .orderBy(desc(attendances.updatedAt))
    .limit(50);
}

export async function listQuotesForEqui(equiId: string, companyId: string) {
  const db = getDb();
  return db
    .select({ quote: quotes })
    .from(quotes)
    .innerJoin(attendances, eq(quotes.attendanceId, attendances.id))
    .where(and(eq(attendances.equiId, equiId), eq(quotes.companyId, companyId)))
    .orderBy(desc(quotes.createdAt))
    .limit(50);
}

export async function listEquiForClient(clientId: string, companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(equiUnits)
    .where(
      and(eq(equiUnits.clientId, clientId), eq(equiUnits.companyId, companyId), eq(equiUnits.active, true)),
    )
    .orderBy(desc(equiUnits.updatedAt))
    .limit(50);
}

export async function listMotForClient(
  clientId: string,
  companyId: string,
  companyCode: "SYSTRON" | "SERVOMOTORES",
) {
  const db = getDb();
  if (companyCode === "SYSTRON") {
    return db
      .select()
      .from(motUnits)
      .where(
        and(
          eq(motUnits.systronClientId, clientId),
          eq(motUnits.originCompanyId, companyId),
          eq(motUnits.active, true),
        ),
      )
      .orderBy(desc(motUnits.updatedAt))
      .limit(50);
  }
  return db
    .select()
    .from(motUnits)
    .where(and(eq(motUnits.servomotoresClientId, clientId), eq(motUnits.active, true)))
    .orderBy(desc(motUnits.updatedAt))
    .limit(50);
}

export async function listAttendancesForClientViaMot(clientId: string, companyCode: "SYSTRON" | "SERVOMOTORES") {
  const db = getDb();
  const clientCol =
    companyCode === "SYSTRON" ? motUnits.systronClientId : motUnits.servomotoresClientId;
  return db
    .select({
      attendance: attendances,
      motFolio: motUnits.folio,
      motId: motUnits.id,
    })
    .from(attendances)
    .innerJoin(motUnits, eq(attendances.motId, motUnits.id))
    .where(and(eq(clientCol, clientId), eq(attendances.active, true)))
    .orderBy(desc(attendances.updatedAt))
    .limit(30);
}

export async function listQuotesForMot(motId: string) {
  const db = getDb();
  return db
    .select({ quote: quotes })
    .from(quotes)
    .innerJoin(attendances, eq(quotes.attendanceId, attendances.id))
    .where(eq(attendances.motId, motId))
    .orderBy(desc(quotes.createdAt))
    .limit(50);
}

export async function getMotDetailEnriched(id: string) {
  const mot = await getMot(id);
  if (!mot) return null;
  const db = getDb();
  const [systronClient, smClient] = await Promise.all([
    mot.systronClientId
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.id, mot.systronClientId))
          .limit(1)
      : Promise.resolve([]),
    mot.servomotoresClientId
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.id, mot.servomotoresClientId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return {
    mot,
    systronClient: systronClient[0] ?? null,
    smClient: smClient[0] ?? null,
  };
}

export async function listAttendancesForClientViaEqui(clientId: string, companyId: string) {
  const db = getDb();
  return db
    .select({
      attendance: attendances,
      equiFolio: equiUnits.folio,
      equiId: equiUnits.id,
    })
    .from(attendances)
    .innerJoin(equiUnits, eq(attendances.equiId, equiUnits.id))
    .where(
      and(
        eq(equiUnits.clientId, clientId),
        eq(attendances.companyId, companyId),
        eq(attendances.active, true),
      ),
    )
    .orderBy(desc(attendances.updatedAt))
    .limit(30);
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
  revalidatePath(`/app/clientes/${clientId}`);
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
  revalidatePath(`/app/clientes/${clientId}`);
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
  revalidatePath(`/app/clientes/${clientId}`);
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

  const ingressAt = new Date();
  const slaDueAt = addBusinessDays(ingressAt, DEFAULT_INGRESS_SLA_DAYS);

  const updated = await db
    .update(motUnits)
    .set({
      custodyStatus: "EN_RESGUARDO_SERVOMOTORES",
      physicalIngressAt: ingressAt,
      slaDueAt,
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(and(eq(motUnits.id, id), eq(motUnits.version, version)))
    .returning({ id: motUnits.id });

  if (updated.length === 0) redirect(`/app/mot/${id}?conflict=1`);

  await logMotCustodyEvent({
    motId: id,
    fromStatus: "PENDIENTE_INGRESO_SERVOMOTORES",
    toStatus: "EN_RESGUARDO_SERVOMOTORES",
    note: `SLA objetivo: ${slaDueAt.toLocaleDateString("es-MX")}`,
    authorUserId: session.id,
  });

  revalidatePath("/app/mot");
  revalidatePath(`/app/mot/${id}`);
  await revalidateCommercialHub({
    motId: id,
    clientId: mot.systronClientId ?? mot.servomotoresClientId ?? undefined,
  });
}

export async function motTrialExitAction(formData: FormData) {
  const session = await requireSession();
  if (!canConfirmMotIngress(session)) throw new Error("Sin permiso");
  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;
  const db = getDb();
  const updated = await db
    .update(motUnits)
    .set({ custodyStatus: "SALIDA_PRUEBA", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(eq(motUnits.id, id), eq(motUnits.version, version), eq(motUnits.custodyStatus, "EN_RESGUARDO_SERVOMOTORES")),
    )
    .returning({ id: motUnits.id });
  if (updated.length === 0) throw new Error("No se pudo registrar salida a prueba");
  await logMotCustodyEvent({
    motId: id,
    fromStatus: "EN_RESGUARDO_SERVOMOTORES",
    toStatus: "SALIDA_PRUEBA",
    note,
    authorUserId: session.id,
  });
  revalidatePath("/app/mot/servomotores");
  revalidatePath(`/app/mot/${id}`);
}

export async function motDefinitiveEgressAction(formData: FormData) {
  const session = await requireSession();
  if (!canConfirmMotIngress(session)) throw new Error("Sin permiso");
  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const recipient = String(formData.get("recipient") ?? "").trim();
  const documentRef = String(formData.get("documentRef") ?? "").trim() || null;
  const fromTrial = formData.get("fromTrial") === "1";
  if (!recipient) throw new Error("Indica quién recibe físicamente");
  if (!documentRef) throw new Error("Indica documento habilitante (remisión, carta porte, etc.)");

  const db = getDb();
  const mot = await getMot(id);
  if (!mot) throw new Error("MOT no encontrado");
  const allowedFrom = fromTrial
    ? mot.custodyStatus === "SALIDA_PRUEBA"
    : mot.custodyStatus === "EN_RESGUARDO_SERVOMOTORES" || mot.custodyStatus === "SALIDA_PRUEBA";
  if (!allowedFrom) throw new Error("Estado de custodia no permite egreso");

  const updated = await db
    .update(motUnits)
    .set({
      custodyStatus: "EGRESADO",
      egressRecipient: recipient,
      egressDocumentRef: documentRef,
      egressAt: sql`now()`,
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(and(eq(motUnits.id, id), eq(motUnits.version, version)))
    .returning({ id: motUnits.id });
  if (updated.length === 0) redirect(`/app/mot/${id}?conflict=1`);

  await logMotCustodyEvent({
    motId: id,
    fromStatus: mot.custodyStatus,
    toStatus: "EGRESADO",
    recipient,
    documentRef,
    note: fromTrial ? "Egreso definitivo desde salida a prueba (sin retorno ficticio)" : null,
    authorUserId: session.id,
  });
  revalidatePath("/app/mot/servomotores");
  revalidatePath(`/app/mot/${id}`);
}

export async function getMotCustodyHistory(motId: string) {
  return listMotCustodyEvents(motId);
}

export async function listMotByCustody(status: "PENDIENTE_INGRESO_SERVOMOTORES" | "EN_RESGUARDO_SERVOMOTORES" | "SALIDA_PRUEBA" | "EGRESADO") {
  const session = await requireSession();
  if (!canConfirmMotIngress(session) && status !== "EGRESADO") return [];
  const db = getDb();
  return db
    .select()
    .from(motUnits)
    .where(and(eq(motUnits.active, true), eq(motUnits.custodyStatus, status)))
    .orderBy(desc(motUnits.createdAt))
    .limit(100);
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
