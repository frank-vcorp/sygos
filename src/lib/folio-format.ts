import type { companies } from "@/db/schema";
import { nextCompanyFolio, nextMotFolio } from "@/lib/folio";

type CompanyCode = (typeof companies.$inferSelect)["code"];

function companyPrefix(code: CompanyCode) {
  return code === "SYSTRON" ? "SY" : "SM";
}

export async function assignClientFolio(companyId: string, companyCode: CompanyCode) {
  const n = await nextCompanyFolio(companyId, "CLIENT");
  return `${companyPrefix(companyCode)}-CLI-${n.padStart(4, "0")}`;
}

export async function assignProspectFolio(companyId: string, companyCode: CompanyCode) {
  const n = await nextCompanyFolio(companyId, "PROSPECT");
  return `${companyPrefix(companyCode)}-PRO-${n.padStart(4, "0")}`;
}

export async function assignSupplierFolio(companyId: string, companyCode: CompanyCode) {
  const n = await nextCompanyFolio(companyId, "SUPPLIER");
  return `${companyPrefix(companyCode)}-PROV-${n.padStart(4, "0")}`;
}

export async function previewNextMotFolio() {
  return nextMotFolio();
}
