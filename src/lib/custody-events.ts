import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { equiWarehouseEvents, motCustodyEvents } from "@/db/schema";

export const DEFAULT_INGRESS_SLA_DAYS = 10;

export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

export async function logEquiWarehouseEvent(input: {
  equiId: string;
  fromStatus: (typeof equiWarehouseEvents.$inferInsert)["fromStatus"];
  toStatus: (typeof equiWarehouseEvents.$inferInsert)["toStatus"];
  note?: string | null;
  authorUserId: string;
}) {
  const db = getDb();
  await db.insert(equiWarehouseEvents).values({
    equiId: input.equiId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    note: input.note ?? null,
    authorUserId: input.authorUserId,
  });
}

export async function logMotCustodyEvent(input: {
  motId: string;
  fromStatus: (typeof motCustodyEvents.$inferInsert)["fromStatus"];
  toStatus: (typeof motCustodyEvents.$inferInsert)["toStatus"];
  note?: string | null;
  recipient?: string | null;
  documentRef?: string | null;
  authorUserId: string;
}) {
  const db = getDb();
  await db.insert(motCustodyEvents).values({
    motId: input.motId,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    note: input.note ?? null,
    recipient: input.recipient ?? null,
    documentRef: input.documentRef ?? null,
    authorUserId: input.authorUserId,
  });
}

export async function listEquiWarehouseEvents(equiId: string) {
  const db = getDb();
  return db
    .select()
    .from(equiWarehouseEvents)
    .where(eq(equiWarehouseEvents.equiId, equiId))
    .orderBy(desc(equiWarehouseEvents.createdAt))
    .limit(100);
}

export async function listMotCustodyEvents(motId: string) {
  const db = getDb();
  return db
    .select()
    .from(motCustodyEvents)
    .where(eq(motCustodyEvents.motId, motId))
    .orderBy(desc(motCustodyEvents.createdAt))
    .limit(100);
}
