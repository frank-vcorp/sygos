"use server";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import {
  clientCommunicationRecipients,
  clientCommunications,
  clientContacts,
  clients,
  folioSequences,
  integrationSettings,
  prospects,
  suppliers,
  users,
} from "@/db/schema";
import { assignClientFolio, assignProspectFolio, assignSupplierFolio } from "@/lib/folio-format";
import {
  insertClientContacts,
  parseClientContactsFromForm,
  resolvePrimaryContactSlot,
} from "@/lib/client-contacts";
import { getSession } from "@/lib/session";
import { logMasterEvent, listMasterEvents } from "@/lib/master-events";
import {
  canManageClients,
  canManageProspects,
  canManageSuppliers,
} from "@/lib/permissions";
import { findLikelyDuplicateClients, findLikelyDuplicateSuppliers } from "@/lib/master-duplicate-search";
import {
  parsePreserveFromForm,
  redirectTargetAfterQuickCreate,
  sanitizeReturnTo,
} from "@/lib/quick-create-return";

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
  const taxIdentity = String(formData.get("taxIdentity") ?? "").trim() || null;
  const returnTo = String(formData.get("returnTo") ?? "");
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";

  if (!confirmDuplicate) {
    const dupes = await findLikelyDuplicateClients(session.activeCompany.id, name, taxIdentity);
    if (dupes.length > 0) {
      const sp = new URLSearchParams();
      if (sanitizeReturnTo(returnTo)) sp.set("returnTo", returnTo);
      sp.set("duplicateWarning", "1");
      sp.set("duplicateIds", dupes.map((d) => d.id).join(","));
      sp.set("name", name);
      if (taxIdentity) sp.set("taxIdentity", taxIdentity);
      const preserve = parsePreserveFromForm(formData);
      for (const [k, v] of Object.entries(preserve)) sp.set(`preserve_${k}`, v);
      redirect(`/app/clientes/nuevo?${sp.toString()}`);
    }
  }

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
      taxIdentity,
      shippingAddress: String(formData.get("shippingAddress") ?? "").trim() || null,
    })
    .returning();

  const parsed = parseClientContactsFromForm(formData);
  if (parsed.length > 0) {
    const primary = resolvePrimaryContactSlot(formData, parsed);
    await insertClientContacts(db, row.id, parsed, primary);
  }

  revalidatePath("/app/clientes");
  redirect(
    redirectTargetAfterQuickCreate(formData, "clientId", row.id, `/app/clientes/${row.id}`),
  );
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
      taxIdentity: String(formData.get("taxIdentity") ?? "").trim() || null,
      shippingAddress: String(formData.get("shippingAddress") ?? "").trim() || null,
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
  const confirmDuplicate = formData.get("confirmDuplicate") === "1";
  const returnTo = String(formData.get("returnTo") ?? "");

  if (!confirmDuplicate) {
    const dupes = await findLikelyDuplicateSuppliers(session.activeCompany.id, name);
    if (dupes.length > 0) {
      const sp = new URLSearchParams();
      if (sanitizeReturnTo(returnTo)) sp.set("returnTo", returnTo);
      sp.set("duplicateWarning", "1");
      sp.set("duplicateIds", dupes.map((d) => d.id).join(","));
      sp.set("name", name);
      redirect(`/app/proveedores/nuevo?${sp.toString()}`);
    }
  }

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
  redirect(
    redirectTargetAfterQuickCreate(formData, "supplierId", row.id, `/app/proveedores/${row.id}`),
  );
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
  return db
    .select()
    .from(clientContacts)
    .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.active, true)))
    .orderBy(desc(clientContacts.isPrimary), asc(clientContacts.name));
}

async function assertClientContactAccess(clientId: string) {
  const session = await requireSession();
  if (!canManageClients(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }
  const client = await getClient(session.activeCompany.id, clientId);
  if (!client || !client.active) throw new Error("Cliente no encontrado");
  if (client.isIntercompany) throw new Error("Contactos de intercompañía son solo lectura");
  return { session, client };
}

export async function addClientContactAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || !name) throw new Error("Datos incompletos");

  await assertClientContactAccess(clientId);
  const db = getDb();
  const existing = await getClientContacts(clientId);
  const makePrimary = formData.get("makePrimary") === "on" || existing.length === 0;

  if (makePrimary) {
    await db
      .update(clientContacts)
      .set({ isPrimary: false })
      .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.active, true)));
  }

  const [inserted] = await db
    .insert(clientContacts)
    .values({
      clientId,
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      roleTitle: String(formData.get("roleTitle") ?? "").trim() || null,
      isPrimary: makePrimary,
    })
    .returning({ id: clientContacts.id });

  revalidatePath(`/app/clientes/${clientId}`);

  const returnTo = String(formData.get("returnTo") ?? "");
  const back = redirectTargetAfterQuickCreate(
    formData,
    "contactId",
    inserted.id,
    `/app/clientes/${clientId}`,
  );
  if (sanitizeReturnTo(returnTo)) {
    redirect(back);
  }
}

export async function setPrimaryClientContactAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!clientId || !contactId) throw new Error("Datos incompletos");

  await assertClientContactAccess(clientId);
  const db = getDb();

  await db
    .update(clientContacts)
    .set({ isPrimary: false })
    .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.active, true)));

  const updated = await db
    .update(clientContacts)
    .set({ isPrimary: true })
    .where(
      and(
        eq(clientContacts.id, contactId),
        eq(clientContacts.clientId, clientId),
        eq(clientContacts.active, true),
      ),
    )
    .returning({ id: clientContacts.id });

  if (updated.length === 0) throw new Error("Contacto no encontrado");

  revalidatePath(`/app/clientes/${clientId}`);
}

export async function removeClientContactAction(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (!clientId || !contactId) throw new Error("Datos incompletos");

  await assertClientContactAccess(clientId);
  const db = getDb();

  const rows = await db
    .select()
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.id, contactId),
        eq(clientContacts.clientId, clientId),
        eq(clientContacts.active, true),
      ),
    )
    .limit(1);
  const target = rows[0];
  if (!target) throw new Error("Contacto no encontrado");

  await db
    .update(clientContacts)
    .set({ active: false, isPrimary: false })
    .where(eq(clientContacts.id, contactId));

  if (target.isPrimary) {
    const remaining = await db
      .select({ id: clientContacts.id })
      .from(clientContacts)
      .where(and(eq(clientContacts.clientId, clientId), eq(clientContacts.active, true)))
      .orderBy(clientContacts.createdAt)
      .limit(1);
    if (remaining[0]) {
      await db.update(clientContacts).set({ isPrimary: true }).where(eq(clientContacts.id, remaining[0].id));
    }
  }

  revalidatePath(`/app/clientes/${clientId}`);
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

export async function listClientCommunications(clientId: string, companyId: string) {
  const db = getDb();
  const comms = await db
    .select()
    .from(clientCommunications)
    .where(and(eq(clientCommunications.clientId, clientId), eq(clientCommunications.companyId, companyId)))
    .orderBy(desc(clientCommunications.createdAt))
    .limit(50);

  if (comms.length === 0) return [];

  const commIds = comms.map((c) => c.id);
  const recipients = await db
    .select({
      communicationId: clientCommunicationRecipients.communicationId,
      contactName: clientContacts.name,
    })
    .from(clientCommunicationRecipients)
    .innerJoin(clientContacts, eq(clientContacts.id, clientCommunicationRecipients.contactId))
    .where(inArray(clientCommunicationRecipients.communicationId, commIds));

  const namesByComm = new Map<string, string[]>();
  for (const r of recipients) {
    const list = namesByComm.get(r.communicationId) ?? [];
    list.push(r.contactName);
    namesByComm.set(r.communicationId, list);
  }

  return comms.map((c) => ({
    ...c,
    recipientNames: namesByComm.get(c.id) ?? [],
  }));
}

export async function logClientCommunicationAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageClients(session.role, session.activeCompany.code)) {
    throw new Error("Sin permiso");
  }

  const clientId = String(formData.get("clientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const contactIds = formData.getAll("contactIds").map(String).filter(Boolean);
  if (!clientId || !body || contactIds.length === 0) {
    throw new Error("Mensaje y al menos un contacto destinatario requeridos");
  }

  const client = await getClient(session.activeCompany.id, clientId);
  if (!client || !client.active) throw new Error("Cliente no encontrado");

  const db = getDb();
  const validContacts = await db
    .select({ id: clientContacts.id })
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.clientId, clientId),
        eq(clientContacts.active, true),
        inArray(clientContacts.id, contactIds),
      ),
    );
  if (validContacts.length !== contactIds.length) throw new Error("Contactos inválidos");

  const [comm] = await db
    .insert(clientCommunications)
    .values({
      companyId: session.activeCompany.id,
      clientId,
      body,
      subject,
      createdByUserId: session.id,
    })
    .returning();

  for (const contactId of contactIds) {
    await db.insert(clientCommunicationRecipients).values({
      communicationId: comm.id,
      contactId,
    });
  }

  const sendEmail = formData.get("sendEmail") === "on";
  const sendWhatsapp = formData.get("sendWhatsapp") === "on";
  if (sendEmail || sendWhatsapp) {
    const { deliverDocument } = await import("@/lib/document-delivery");
    const fullContacts = await db
      .select()
      .from(clientContacts)
      .where(inArray(clientContacts.id, contactIds));
    const deliverySubject = subject ?? `Comunicación — ${client.name}`;
    const { communicationEmailPackage } = await import("@/lib/documents/email-shell");
    const { loadIssuerBrand } = await import("@/lib/documents/load-issuer");
    const issuer = await loadIssuerBrand(session.activeCompany.id);
    for (const contact of fullContacts) {
      const mail = communicationEmailPackage({
        issuer,
        subject: deliverySubject,
        recipientName: contact.name,
        body,
      });
      if (sendEmail) {
        await deliverDocument({
          companyId: session.activeCompany.id,
          channel: "EMAIL",
          entityType: "CLIENT_COMMUNICATION",
          entityId: comm.id,
          contactId: contact.id,
          recipientName: contact.name,
          recipientEmail: contact.email,
          recipientPhone: contact.phone,
          subject: mail.subject,
          body: mail.plainText,
          html: mail.html,
          createdByUserId: session.id,
        });
      }
      if (sendWhatsapp) {
        await deliverDocument({
          companyId: session.activeCompany.id,
          channel: "WHATSAPP",
          entityType: "CLIENT_COMMUNICATION",
          entityId: comm.id,
          contactId: contact.id,
          recipientName: contact.name,
          recipientEmail: contact.email,
          recipientPhone: contact.phone,
          subject: deliverySubject,
          body: mail.plainText,
          whatsappBody: mail.whatsappBody ?? mail.plainText,
          createdByUserId: session.id,
        });
      }
    }
  }

  revalidatePath(`/app/clientes/${clientId}`);
}
