import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { masterRecordEvents } from "@/db/schema";

type EntityType = "CLIENT" | "PROSPECT" | "SUPPLIER";
type EventType = "UPDATED" | "CANCELLED";

export async function logMasterEvent(input: {
  companyId: string;
  entityType: EntityType;
  entityId: string;
  eventType: EventType;
  actorUserId: string;
  reason?: string | null;
}) {
  const db = getDb();
  await db.insert(masterRecordEvents).values({
    companyId: input.companyId,
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    reason: input.reason ?? null,
  });
}

export async function listMasterEvents(entityType: EntityType, entityId: string) {
  const db = getDb();
  return db
    .select()
    .from(masterRecordEvents)
    .where(and(eq(masterRecordEvents.entityType, entityType), eq(masterRecordEvents.entityId, entityId)))
    .orderBy(desc(masterRecordEvents.createdAt))
    .limit(50);
}

export class ConcurrentEditError extends Error {
  constructor() {
    super("El registro cambió en otra sesión. Recarga la página e intenta de nuevo.");
    this.name = "ConcurrentEditError";
  }
}
