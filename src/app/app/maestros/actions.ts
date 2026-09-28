"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { clientContacts, clients, prospects, suppliers } from "@/db/schema";
import { getSession } from "@/lib/session";
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
  const [row] = await db
    .insert(clients)
    .values({
      companyId: session.activeCompany.id,
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
  await db.insert(prospects).values({
    companyId: session.activeCompany.id,
    name,
    responsibleUserId: session.id,
    source: String(formData.get("source") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
  });

  revalidatePath("/app/prospectos");
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
  await db.insert(suppliers).values({
    companyId: session.activeCompany.id,
    name,
    contactName: String(formData.get("contactName") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    creditDays: Number(formData.get("creditDays") ?? 0) || 0,
    emitsFiscalInvoice: formData.get("emitsFiscalInvoice") !== "off",
  });

  revalidatePath("/app/proveedores");
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

export async function getClientContacts(clientId: string) {
  const db = getDb();
  return db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
}
