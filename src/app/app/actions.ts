"use server";

import { revalidatePath } from "next/cache";
import { getSession, switchActiveCompany } from "@/lib/session";

export async function switchCompanyAction(companyId: string) {
  const session = await getSession();
  if (!session) throw new Error("No autenticado");
  await switchActiveCompany(session.id, companyId);
  revalidatePath("/app");
}
