/* eslint-disable react-hooks/rules-of-hooks -- Baileys `useMultiFileAuthState` no es un hook de React */
import { mkdir } from "fs/promises";
import path from "path";
import { eq, sql } from "drizzle-orm";
import type { WASocket } from "@whiskeysockets/baileys";
import { getDb } from "@/db/client";
import { whatsappSessions } from "@/db/schema";
import { encryptJson } from "@/lib/integration-crypto";
import {
  clearPairingMemory,
  getWhatsAppSnapshot,
  setIntegrationWhatsappConfigured,
  upsertWhatsAppSessionRow,
  writePairingMemory,
} from "@/lib/whatsapp-snapshot";

const sockets = new Map<string, WASocket>();

function authDir(companyId: string) {
  return path.join(process.cwd(), ".data", "whatsapp-auth", companyId);
}

async function loadBaileys() {
  const baileys = await import("@whiskeysockets/baileys");
  return {
    default: baileys.default,
    DisconnectReason: baileys.DisconnectReason,
    fetchLatestBaileysVersion: baileys.fetchLatestBaileysVersion,
    useMultiFileAuthState: baileys.useMultiFileAuthState,
  };
}

async function startSocket(companyId: string) {
  if (sockets.has(companyId)) return sockets.get(companyId)!;

  const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } =
    await loadBaileys();

  const dir = authDir(companyId);
  await mkdir(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sockets.set(companyId, sock);

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    try {
      const { readFile } = await import("fs/promises");
      const credsRaw = await readFile(path.join(dir, "creds.json"), "utf8");
      const ciphertext = encryptJson({ credsRaw });
      const db = getDb();
      await db
        .update(whatsappSessions)
        .set({ authCiphertext: ciphertext, updatedAt: sql`now()` })
        .where(eq(whatsappSessions.companyId, companyId));
    } catch {
      /* creds file may not exist yet */
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      writePairingMemory(companyId, { qr, status: "QR_PENDING" });
      await upsertWhatsAppSessionRow(companyId, { status: "QR_PENDING", lastError: null });
      await setIntegrationWhatsappConfigured(companyId, false);
    }
    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0] ?? null;
      writePairingMemory(companyId, { status: "CONNECTED", linkedPhone: phone, qr: undefined });
      await upsertWhatsAppSessionRow(companyId, { status: "CONNECTED", linkedPhone: phone, lastError: null });
      await setIntegrationWhatsappConfigured(companyId, true);
    }
    if (connection === "close") {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
        ?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      sockets.delete(companyId);
      writePairingMemory(companyId, {
        status: "DISCONNECTED",
        lastError: loggedOut ? "Sesión cerrada en el teléfono" : "Conexión cerrada",
      });
      await upsertWhatsAppSessionRow(companyId, {
        status: "DISCONNECTED",
        linkedPhone: null,
        lastError: loggedOut ? "Sesión cerrada en el teléfono" : "Conexión cerrada",
      });
      await setIntegrationWhatsappConfigured(companyId, false);
      if (!loggedOut) {
        void startSocket(companyId);
      }
    }
  });

  return sock;
}

export async function requestWhatsAppPairing(companyId: string) {
  await upsertWhatsAppSessionRow(companyId, { status: "QR_PENDING", lastError: null });
  await startSocket(companyId);
  return getWhatsAppSnapshot(companyId);
}

export async function disconnectWhatsApp(companyId: string) {
  const sock = sockets.get(companyId);
  if (sock) {
    await sock.logout();
    sockets.delete(companyId);
  }
  clearPairingMemory(companyId);
  await upsertWhatsAppSessionRow(companyId, {
    status: "DISCONNECTED",
    linkedPhone: null,
    lastError: null,
  });
  await setIntegrationWhatsappConfigured(companyId, false);
}

export async function sendWhatsAppText(companyId: string, toPhone: string, message: string) {
  const snap = await getWhatsAppSnapshot(companyId);
  if (snap.status !== "CONNECTED") {
    return { ok: false as const, error: "WhatsApp no vinculado — escanea el QR en Integraciones" };
  }
  let sock = sockets.get(companyId);
  if (!sock) {
    sock = await startSocket(companyId);
  }
  const jid = `${toPhone.replace(/\D/g, "")}@s.whatsapp.net`;
  try {
    await sock.sendMessage(jid, { text: message });
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Error al enviar WhatsApp" };
  }
}
