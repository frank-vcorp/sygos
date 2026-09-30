import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { integrationSecrets, integrationSettings } from "@/db/schema";
import { decryptJson, encryptJson } from "@/lib/integration-crypto";
import type { IntegrationConfigMap, IntegrationKey } from "@/lib/integration-types";

function isConfiguredPayload(key: IntegrationKey, payload: IntegrationConfigMap[IntegrationKey]): boolean {
  if (key === "FACTURAPI") {
    const p = payload as IntegrationConfigMap["FACTURAPI"];
    return Boolean(p.apiKey?.trim());
  }
  if (key === "SENDGRID") {
    const p = payload as IntegrationConfigMap["SENDGRID"];
    return Boolean(p.apiKey?.trim() && p.fromEmail?.trim());
  }
  if (key === "WHATSAPP") {
    return false;
  }
  return false;
}

export async function getIntegrationConfig<K extends IntegrationKey>(
  companyId: string,
  integration: K,
): Promise<IntegrationConfigMap[K] | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(integrationSecrets)
    .where(and(eq(integrationSecrets.companyId, companyId), eq(integrationSecrets.integration, integration)))
    .limit(1);
  if (!row) return null;
  try {
    return decryptJson<IntegrationConfigMap[K]>(row.ciphertext);
  } catch {
    return null;
  }
}

export async function setIntegrationConfig<K extends IntegrationKey>(
  companyId: string,
  integration: K,
  payload: IntegrationConfigMap[K],
  updatedByUserId: string,
) {
  const db = getDb();
  const ciphertext = encryptJson(payload);
  await db
    .insert(integrationSecrets)
    .values({
      companyId,
      integration,
      ciphertext,
      updatedByUserId,
    })
    .onConflictDoUpdate({
      target: [integrationSecrets.companyId, integrationSecrets.integration],
      set: {
        ciphertext,
        updatedByUserId,
        updatedAt: sql`now()`,
      },
    });

  const configured = isConfiguredPayload(integration, payload);
  await db
    .insert(integrationSettings)
    .values({ companyId, integration, configured })
    .onConflictDoUpdate({
      target: [integrationSettings.companyId, integrationSettings.integration],
      set: { configured, updatedAt: sql`now()` },
    });
}

export async function clearIntegrationConfig(companyId: string, integration: IntegrationKey) {
  const db = getDb();
  await db
    .delete(integrationSecrets)
    .where(and(eq(integrationSecrets.companyId, companyId), eq(integrationSecrets.integration, integration)));
  await db
    .update(integrationSettings)
    .set({ configured: false, updatedAt: sql`now()` })
    .where(
      and(eq(integrationSettings.companyId, companyId), eq(integrationSettings.integration, integration)),
    );
}

export async function isIntegrationConfigured(companyId: string, integration: IntegrationKey) {
  const config = await getIntegrationConfig(companyId, integration);
  if (!config) return false;
  return isConfiguredPayload(integration, config);
}

/** Máscara para UI: solo últimos 4 caracteres de secretos. */
export function maskSecret(value: string | undefined, visible = 4) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= visible) return "••••";
  return `${"•".repeat(Math.min(12, trimmed.length - visible))}${trimmed.slice(-visible)}`;
}
