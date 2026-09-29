"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { companySettings } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function toggleTestModeAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRADOR") throw new Error("Solo Administrador");
  const enabled = formData.get("enabled") === "on";
  const db = getDb();
  await db
    .insert(companySettings)
    .values({ companyId: session.activeCompany.id, testModeEnabled: enabled })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { testModeEnabled: enabled, updatedAt: sql`now()` },
    });
  revalidatePath("/app/configuracion");
}
