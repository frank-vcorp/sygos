import type { companies } from "@/db/schema";

type CompanyCode = (typeof companies.$inferSelect)["code"];

export type DiagnosisPriority = "NORMAL" | "ALTA" | "EXPRESS";
export type RepairPriority = "NORMAL" | "ALTA" | "EXPRESS";

const SYSTRON_DIAGNOSIS: Record<DiagnosisPriority, { priceMxn: number; slaDays: number }> = {
  NORMAL: { priceMxn: 0, slaDays: 10 },
  ALTA: { priceMxn: 3500, slaDays: 5 },
  EXPRESS: { priceMxn: 4500, slaDays: 1 },
};

const SERVOMOTORES_DIAGNOSIS: Record<DiagnosisPriority, { priceMxn: number; slaDays: number }> = {
  NORMAL: { priceMxn: 0, slaDays: 10 },
  ALTA: { priceMxn: 3000, slaDays: 5 },
  EXPRESS: { priceMxn: 4000, slaDays: 1 },
};

const SYSTRON_REPAIR: Record<RepairPriority, { incrementPercent: number; slaDays: number }> = {
  NORMAL: { incrementPercent: 0, slaDays: 10 },
  ALTA: { incrementPercent: 10, slaDays: 5 },
  EXPRESS: { incrementPercent: 20, slaDays: 1 },
};

const SERVOMOTORES_REPAIR: Record<RepairPriority, { incrementPercent: number; slaDays: number }> = {
  NORMAL: { incrementPercent: 0, slaDays: 10 },
  ALTA: { incrementPercent: 10, slaDays: 5 },
  EXPRESS: { incrementPercent: 20, slaDays: 1 },
};

export function diagnosisSnapshot(companyCode: CompanyCode, priority: DiagnosisPriority) {
  const table = companyCode === "SYSTRON" ? SYSTRON_DIAGNOSIS : SERVOMOTORES_DIAGNOSIS;
  return table[priority] ?? table.NORMAL;
}

export function repairSnapshot(companyCode: CompanyCode, priority: RepairPriority) {
  const table = companyCode === "SYSTRON" ? SYSTRON_REPAIR : SERVOMOTORES_REPAIR;
  return table[priority] ?? table.NORMAL;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
