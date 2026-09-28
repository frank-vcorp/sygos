import type { SessionUser } from "@/lib/session";

const GLOBAL_SEARCH_ROLES = new Set<SessionUser["role"]>(["ADMINISTRADOR", "CEO"]);

export function canUseGlobalSearch(role: SessionUser["role"]) {
  return GLOBAL_SEARCH_ROLES.has(role);
}

export function canManageClients(role: SessionUser["role"], companyCode: SessionUser["activeCompany"]["code"]) {
  if (role === "ADMINISTRADOR" || role === "CEO" || role === "COORDINACION_ADMIN") return true;
  if (companyCode === "SYSTRON" && role === "VENTAS_SYSTRON") return true;
  if (companyCode === "SERVOMOTORES" && role === "GERENTE_OPERATIVO_SERVOMOTORES") return true;
  return false;
}

export function canManageProspects(role: SessionUser["role"], companyCode: SessionUser["activeCompany"]["code"]) {
  return canManageClients(role, companyCode);
}

export function canManageSuppliers(role: SessionUser["role"]) {
  return (
    role === "ADMINISTRADOR" ||
    role === "CEO" ||
    role === "COORDINACION_ADMIN" ||
    role === "GERENTE_OPERATIVO_SYSTRON" ||
    role === "GERENTE_OPERATIVO_SERVOMOTORES"
  );
}

export function canConfigureIntegrations(role: SessionUser["role"]) {
  return role === "ADMINISTRADOR";
}

export function canConfigureCompanySettings(role: SessionUser["role"]) {
  return role === "ADMINISTRADOR" || role === "CEO";
}
