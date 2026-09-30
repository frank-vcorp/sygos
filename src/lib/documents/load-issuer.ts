import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies } from "@/db/schema";
import { getCompanySettings } from "@/lib/company-settings";
import type { IssuerBrand } from "@/lib/documents/types";

export async function loadIssuerBrand(companyId: string): Promise<IssuerBrand> {
  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const settings = await getCompanySettings(companyId);
  return {
    displayName: company?.displayName ?? "Empresa",
    legalName: settings.fiscalLegalName?.trim() || company?.legalName || "Empresa",
    rfc: settings.fiscalRfc?.trim() || null,
    companyCode: company?.code ?? "SYSTRON",
  };
}
