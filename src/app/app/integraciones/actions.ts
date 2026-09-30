"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { canConfigureIntegrations } from "@/lib/permissions";

export async function requireIntegrationAdmin() {
  const session = await getSession();
  if (!session || !canConfigureIntegrations(session.role)) {
    throw new Error("Solo Administrador puede configurar integraciones");
  }
  return session;
}

export async function revalidateIntegrationsPage() {
  revalidatePath("/app/integraciones");
  revalidatePath("/app", "layout");
}
