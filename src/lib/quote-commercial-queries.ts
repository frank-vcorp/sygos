import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  clientContacts,
  clients,
  equiUnits,
  motUnits,
  quoteIntendedContacts,
  quoteLines,
} from "@/db/schema";

export async function listActiveContactsForCompany(companyId: string) {
  const db = getDb();
  return db
    .select({
      id: clientContacts.id,
      clientId: clientContacts.clientId,
      name: clientContacts.name,
      email: clientContacts.email,
      phone: clientContacts.phone,
    })
    .from(clientContacts)
    .innerJoin(clients, eq(clients.id, clientContacts.clientId))
    .where(and(eq(clients.companyId, companyId), eq(clientContacts.active, true)))
    .limit(500);
}

export async function listEquiOptionsForCommercial(companyId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: equiUnits.id,
      clientId: equiUnits.clientId,
      folio: equiUnits.folio,
      model: equiUnits.model,
      brand: equiUnits.brand,
    })
    .from(equiUnits)
    .where(and(eq(equiUnits.companyId, companyId), eq(equiUnits.active, true)))
    .limit(300);
  return rows.map((r) => ({
    id: r.id,
    clientId: r.clientId,
    folio: r.folio,
    label: `${r.folio} · ${r.brand ?? "—"} ${r.model}`,
  }));
}

export async function listMotOptionsForCommercial(companyCode: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: motUnits.id,
      folio: motUnits.folio,
      model: motUnits.model,
      brand: motUnits.brand,
      systronClientId: motUnits.systronClientId,
      servomotoresClientId: motUnits.servomotoresClientId,
    })
    .from(motUnits)
    .limit(300);
  return rows.map((r) => ({
    id: r.id,
    folio: r.folio,
    clientId: companyCode === "SYSTRON" ? r.systronClientId : r.servomotoresClientId,
    label: `${r.folio} · ${r.brand ?? "—"} ${r.model}`,
  }));
}

export async function listQuoteLines(quoteId: string) {
  const db = getDb();
  return db
    .select()
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(asc(quoteLines.sortOrder));
}

export async function listQuoteIntendedContacts(quoteId: string) {
  const db = getDb();
  return db
    .select({
      contactId: quoteIntendedContacts.contactId,
      name: clientContacts.name,
      email: clientContacts.email,
      phone: clientContacts.phone,
    })
    .from(quoteIntendedContacts)
    .innerJoin(clientContacts, eq(clientContacts.id, quoteIntendedContacts.contactId))
    .where(eq(quoteIntendedContacts.quoteId, quoteId));
}
