import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, suppliers } from "@/db/schema";

export async function findLikelyDuplicateClients(companyId: string, name: string, taxIdentity: string | null) {
  const normalized = name.trim();
  if (normalized.length < 2) return [];

  const db = getDb();
  const namePattern = `%${normalized.replaceAll("%", "").replaceAll("_", "")}%`;
  const conditions = [ilike(clients.name, namePattern)];

  const rfc = taxIdentity?.trim().toUpperCase();
  if (rfc && rfc.length >= 10) {
    conditions.push(eq(clients.taxIdentity, rfc));
  }

  return db
    .select({ id: clients.id, name: clients.name, folio: clients.folio })
    .from(clients)
    .where(and(eq(clients.companyId, companyId), eq(clients.active, true), or(...conditions)))
    .orderBy(clients.name)
    .limit(8);
}

export async function findLikelyDuplicateSuppliers(companyId: string, name: string) {
  const normalized = name.trim();
  if (normalized.length < 2) return [];

  const db = getDb();
  const namePattern = `%${normalized.replaceAll("%", "").replaceAll("_", "")}%`;

  return db
    .select({ id: suppliers.id, name: suppliers.name, folio: suppliers.folio })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, companyId), eq(suppliers.active, true), ilike(suppliers.name, namePattern)))
    .orderBy(suppliers.name)
    .limit(8);
}
