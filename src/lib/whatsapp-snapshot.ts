import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationSettings, whatsappSessions } from "@/db/schema";

export type WhatsAppPairingSnapshot = {
  qr?: string;
  status: "DISCONNECTED" | "QR_PENDING" | "CONNECTED";
  linkedPhone?: string | null;
  lastError?: string | null;
};

/** Estado en memoria del proceso (QR activo, etc.). */
const pairing = new Map<string, WhatsAppPairingSnapshot>();

export function readPairingMemory(companyId: string) {
  return pairing.get(companyId);
}

export function writePairingMemory(companyId: string, snap: WhatsAppPairingSnapshot) {
  pairing.set(companyId, snap);
}

export function clearPairingMemory(companyId: string) {
  pairing.delete(companyId);
}

export async function upsertWhatsAppSessionRow(
  companyId: string,
  patch: Partial<{
    status: WhatsAppPairingSnapshot["status"];
    linkedPhone: string | null;
    lastError: string | null;
  }>,
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.companyId, companyId))
    .limit(1);
  if (existing) {
    await db
      .update(whatsappSessions)
      .set({
        status: patch.status ?? existing.status,
        linkedPhone: patch.linkedPhone !== undefined ? patch.linkedPhone : existing.linkedPhone,
        lastError: patch.lastError !== undefined ? patch.lastError : existing.lastError,
        updatedAt: sql`now()`,
      })
      .where(eq(whatsappSessions.companyId, companyId));
    return;
  }
  await db.insert(whatsappSessions).values({
    companyId,
    status: patch.status ?? "DISCONNECTED",
    linkedPhone: patch.linkedPhone ?? null,
    lastError: patch.lastError ?? null,
  });
}

export async function setIntegrationWhatsappConfigured(companyId: string, configured: boolean) {
  const db = getDb();
  await db
    .update(integrationSettings)
    .set({ configured, updatedAt: sql`now()` })
    .where(and(eq(integrationSettings.companyId, companyId), eq(integrationSettings.integration, "WHATSAPP")));
}

export async function getWhatsAppSnapshot(companyId: string): Promise<WhatsAppPairingSnapshot> {
  const mem = pairing.get(companyId);
  if (mem) return mem;
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(whatsappSessions)
      .where(eq(whatsappSessions.companyId, companyId))
      .limit(1);
    if (!row) return { status: "DISCONNECTED" };
    return {
      status: row.status,
      linkedPhone: row.linkedPhone,
      lastError: row.lastError,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/whatsapp_sessions|does not exist|relation/i.test(msg)) {
      return {
        status: "DISCONNECTED",
        lastError: "Tablas de WhatsApp no migradas (0013) en el servidor",
      };
    }
    throw err;
  }
}
