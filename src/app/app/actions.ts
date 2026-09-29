"use server";

import { revalidatePath } from "next/cache";
import { canSwitchActiveCompany } from "@/lib/permissions-company";
import { getSession, switchActiveCompany } from "@/lib/session";

export async function switchCompanyAction(companyId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  if (!canSwitchActiveCompany(session.role)) {
    throw new Error("Tu rol no puede cambiar de empresa");
  }
  if (!session.allowedCompanies.some((c) => c.id === companyId)) {
    throw new Error("Empresa no permitida");
  }
  await switchActiveCompany(session.id, companyId);
  revalidatePath("/app", "layout");
}
