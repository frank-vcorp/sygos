import { and, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, prospects, suppliers } from "@/db/schema";

export type GlobalSearchHit = {
  type: "client" | "prospect" | "supplier";
  id: string;
  label: string;
  href: string;
};

export async function globalSearch(companyId: string, query: string, limit = 20): Promise<GlobalSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q}%`;
  const db = getDb();
  const cap = Math.min(limit, 50);

  const [clientRows, prospectRows, supplierRows] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.companyId, companyId), eq(clients.active, true), ilike(clients.name, pattern)))
      .limit(cap),
    db
      .select({ id: prospects.id, name: prospects.name })
      .from(prospects)
      .where(
        and(
          eq(prospects.companyId, companyId),
          eq(prospects.active, true),
          or(ilike(prospects.name, pattern), ilike(prospects.note, pattern)),
        ),
      )
      .limit(cap),
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(and(eq(suppliers.companyId, companyId), eq(suppliers.active, true), ilike(suppliers.name, pattern)))
      .limit(cap),
  ]);

  const hits: GlobalSearchHit[] = [
    ...clientRows.map((r) => ({
      type: "client" as const,
      id: r.id,
      label: r.name,
      href: `/app/clientes/${r.id}`,
    })),
    ...prospectRows.map((r) => ({
      type: "prospect" as const,
      id: r.id,
      label: r.name,
      href: `/app/prospectos/${r.id}`,
    })),
    ...supplierRows.map((r) => ({
      type: "supplier" as const,
      id: r.id,
      label: r.name,
      href: `/app/proveedores/${r.id}`,
    })),
  ];

  return hits.slice(0, cap);
}
