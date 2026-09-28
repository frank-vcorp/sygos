"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  clientContacts,
  clients,
  folioSequences,
  integrationSettings,
  prospects,
  suppliers,
  users,
} from "@/db/schema";
import { assignClientFolio, assignProspectFolio, assignSupplierFolio } from "@/lib/folio-format";
import { getSession } from "@/lib/session";
import { logMasterEvent, listMasterEvents } from "@/lib/master-events";
import {
  canManageClients,
  canManageProspects,
  canManageSuppliers,
} from "@/lib/permissions";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  return session;
}

export async function listClients(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.active, true)))
    .orderBy(desc(clients.createdAt))
    .limit(200);
}

export async function createClientAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageClients(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nombre requerido");

  const db = getDb();
  const folio = await assignClientFolio(session.activeCompany.id, session.activeCompany.code);

  const [row] = await db
    .insert(clients)
    .values({
      companyId: session.activeCompany.id,
      folio,
      name,
      responsibleUserId: session.id,
      requiresInvoice: formData.get("requiresInvoice") === "on",
      creditDays: Number(formData.get("creditDays") ?? 0) || 0,
    })
    .returning();

  const contactName = String(formData.get("contactName") ?? "").trim();
  if (contactName) {
    await db.insert(clientContacts).values({
      clientId: row.id,
      name: contactName,
      email: String(formData.get("contactEmail") ?? "").trim() || null,
      phone: String(formData.get("contactPhone") ?? "").trim() || null,
      isPrimary: true,
    });
  }

  revalidatePath("/app/clientes");
  redirect(`/app/clientes/${row.id}`);
}

export async function updateClientAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageClients(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || !version) throw new Error("Datos incompletos");

  const db = getDb();
  const existing = await getClient(session.activeCompany.id, id);
  if (!existing || !existing.active) throw new Error("Cliente no encontrado");
  if (existing.isIntercompany) throw new Error("No se puede editar un registro intercompañía desde aquí");

  const updated = await db
    .update(clients)
    .set({
      name,
      creditDays: Number(formData.get("creditDays") ?? 0) || 0,
      requiresInvoice: formData.get("requiresInvoice") === "on",
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(clients.id, id),
        eq(clients.companyId, session.activeCompany.id),
        eq(clients.version, version),
      ),
    )
    .returning({ id: clients.id });

  if (updated.length === 0) {
    redirect(`/app/clientes/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "CLIENT",
    entityId: id,
    eventType: "UPDATED",
    actorUserId: session.id,
  });

  revalidatePath(`/app/clientes/${id}`);
  revalidatePath("/app/clientes");
}

export async function cancelClientAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageClients(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !version || reason.length < 3) throw new Error("Indica un motivo de baja (mín. 3 caracteres)");

  const db = getDb();
  const existing = await getClient(session.activeCompany.id, id);
  if (!existing || !existing.active) throw new Error("Cliente no encontrado");
  if (existing.isIntercompany) throw new Error("No se puede dar de baja un registro intercompañía");

  const updated = await db
    .update(clients)
    .set({ active: false, version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(clients.id, id),
        eq(clients.companyId, session.activeCompany.id),
        eq(clients.version, version),
      ),
    )
    .returning({ id: clients.id });

  if (updated.length === 0) {
    redirect(`/app/clientes/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "CLIENT",
    entityId: id,
    eventType: "CANCELLED",
    actorUserId: session.id,
    reason,
  });

  revalidatePath("/app/clientes");
  redirect("/app/clientes");
}

export async function listProspects(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(prospects)
    .where(and(eq(prospects.companyId, companyId), eq(prospects.active, true)))
    .orderBy(desc(prospects.createdAt))
    .limit(200);
}

export async function createProspectAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageProspects(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nombre requerido");

  const db = getDb();
  const folio = await assignProspectFolio(session.activeCompany.id, session.activeCompany.code);
  const [row] = await db.insert(prospects).values({
    companyId: session.activeCompany.id,
    folio,
    name,
    responsibleUserId: session.id,
    source: String(formData.get("source") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
  }).returning();

  revalidatePath("/app/prospectos");
  redirect(`/app/prospectos/${row.id}`);
}

export async function updateProspectAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageProspects(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || !version) throw new Error("Datos incompletos");

  const db = getDb();
  const updated = await db
    .update(prospects)
    .set({
      name,
      source: String(formData.get("source") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(prospects.id, id),
        eq(prospects.companyId, session.activeCompany.id),
        eq(prospects.version, version),
        eq(prospects.active, true),
      ),
    )
    .returning({ id: prospects.id });

  if (updated.length === 0) {
    redirect(`/app/prospectos/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "PROSPECT",
    entityId: id,
    eventType: "UPDATED",
    actorUserId: session.id,
  });

  revalidatePath(`/app/prospectos/${id}`);
}

export async function cancelProspectAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageProspects(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !version || reason.length < 3) throw new Error("Indica un motivo de baja");

  const db = getDb();
  const updated = await db
    .update(prospects)
    .set({ active: false, status: "DESCARTADO", version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(prospects.id, id),
        eq(prospects.companyId, session.activeCompany.id),
        eq(prospects.version, version),
        eq(prospects.active, true),
      ),
    )
    .returning({ id: prospects.id });

  if (updated.length === 0) {
    redirect(`/app/prospectos/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "PROSPECT",
    entityId: id,
    eventType: "CANCELLED",
    actorUserId: session.id,
    reason,
  });

  revalidatePath("/app/prospectos");
  redirect("/app/prospectos");
}

export async function listSuppliers(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.companyId, companyId), eq(suppliers.active, true)))
    .orderBy(desc(suppliers.createdAt))
    .limit(200);
}

export async function createSupplierAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageSuppliers(session.role)) {
    throw new Error("Sin permiso");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nombre requerido");

  const db = getDb();
  const folio = await assignSupplierFolio(session.activeCompany.id, session.activeCompany.code);
  const [row] = await db.insert(suppliers).values({
    companyId: session.activeCompany.id,
    folio,
    name,
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    creditDays: Number(formData.get("creditDays") ?? 0) || 0,
    emitsFiscalInvoice: formData.get("emitsFiscalInvoice") !== "off",
  }).returning();

  revalidatePath("/app/proveedores");
  redirect(`/app/proveedores/${row.id}`);
}

export async function updateSupplierAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageSuppliers(session.role)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name || !version) throw new Error("Datos incompletos");

  const db = getDb();
  const existing = await getSupplier(session.activeCompany.id, id);
  if (!existing?.active) throw new Error("Proveedor no encontrado");
  if (existing.isIntercompany) throw new Error("No se puede editar un registro intercompañía");

  const updated = await db
    .update(suppliers)
    .set({
      name,
      contactName: String(formData.get("contactName") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      creditDays: Number(formData.get("creditDays") ?? 0) || 0,
      emitsFiscalInvoice: formData.get("emitsFiscalInvoice") !== "off",
      version: version + 1,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.companyId, session.activeCompany.id),
        eq(suppliers.version, version),
      ),
    )
    .returning({ id: suppliers.id });

  if (updated.length === 0) {
    redirect(`/app/proveedores/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "SUPPLIER",
    entityId: id,
    eventType: "UPDATED",
    actorUserId: session.id,
  });

  revalidatePath(`/app/proveedores/${id}`);
}

export async function cancelSupplierAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageSuppliers(session.role)) {
    throw new Error("Sin permiso");
  }

  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !version || reason.length < 3) throw new Error("Indica un motivo de baja");

  const db = getDb();
  const existing = await getSupplier(session.activeCompany.id, id);
  if (!existing?.active) throw new Error("Proveedor no encontrado");
  if (existing.isIntercompany) throw new Error("No se puede dar de baja un registro intercompañía");

  const updated = await db
    .update(suppliers)
    .set({ active: false, version: version + 1, updatedAt: sql`now()` })
    .where(
      and(
        eq(suppliers.id, id),
        eq(suppliers.companyId, session.activeCompany.id),
        eq(suppliers.version, version),
      ),
    )
    .returning({ id: suppliers.id });

  if (updated.length === 0) {
    redirect(`/app/proveedores/${id}?conflict=1`);
  }

  await logMasterEvent({
    companyId: session.activeCompany.id,
    entityType: "SUPPLIER",
    entityId: id,
    eventType: "CANCELLED",
    actorUserId: session.id,
    reason,
  });

  revalidatePath("/app/proveedores");
  redirect("/app/proveedores");
}

export async function getClient(companyId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getProspect(companyId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(prospects)
    .where(and(eq(prospects.id, id), eq(prospects.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSupplier(companyId: string, id: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClientContacts(clientId: string) {
  const db = getDb();
  return db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
}

export async function getEntityHistory(entityType: "CLIENT" | "PROSPECT" | "SUPPLIER", entityId: string) {
  const events = await listMasterEvents(entityType, entityId);
  if (events.length === 0) return [];

  const db = getDb();
  const actorIds = [...new Set(events.map((e) => e.actorUserId))];
  const actors = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(inArray(users.id, actorIds));

  const nameById = Object.fromEntries(actors.map((a) => [a.id, a.displayName]));
  return events.map((e) => ({
    ...e,
    actorName: nameById[e.actorUserId] ?? "Usuario",
  }));
}

export async function listIntegrations(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.companyId, companyId))
    .orderBy(integrationSettings.integration);
}

export async function getMotSequenceState() {
  const db = getDb();
  const rows = await db
    .select()
    .from(folioSequences)
    .where(and(eq(folioSequences.scope, "GLOBAL_MOT"), eq(folioSequences.key, "MOT")))
    .limit(1);
  const last = rows[0]?.lastValue ?? "0";
  const nextNum = Number(last) + 1;
  return { lastAssigned: last === "0" ? null : `MOT-${last}`, nextPreview: `MOT-${nextNum}` };
}
