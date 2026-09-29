import type { SessionUser } from "@/lib/session";

const MULTI_COMPANY_ROLES = new Set<SessionUser["role"]>([
  "ADMINISTRADOR",
  "CEO",
  "COORDINACION_ADMIN",
]);

export function canSwitchActiveCompany(role: SessionUser["role"]) {
  return MULTI_COMPANY_ROLES.has(role);
}
