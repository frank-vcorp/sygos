import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { documentDeliveries } from "@/db/schema";

export async function logDocumentDelivery(input: {
  companyId: string;
  channel: "EMAIL" | "WHATSAPP";
  status: "PENDING" | "SENT" | "FAILED";
  entityType: string;
  entityId: string;
  contactId?: string | null;
  recipient: string;
  subject?: string | null;
  errorMessage?: string | null;
  createdByUserId: string;
}) {
  const db = getDb();
  const [row] = await db
    .insert(documentDeliveries)
    .values({
      companyId: input.companyId,
      channel: input.channel,
      status: input.status,
      entityType: input.entityType,
      entityId: input.entityId,
      contactId: input.contactId ?? null,
      recipient: input.recipient,
      subject: input.subject ?? null,
      errorMessage: input.errorMessage ?? null,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: documentDeliveries.id });
  return row.id;
}

export async function listDocumentDeliveriesForEntity(entityType: string, entityId: string) {
  const db = getDb();
  return db
    .select()
    .from(documentDeliveries)
    .where(eq(documentDeliveries.entityId, entityId))
    .limit(50);
}
