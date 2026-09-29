import type { SessionUser } from "@/lib/session";

const ADMIN_ROLES = new Set<SessionUser["role"]>(["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"]);

export function canViewEqui(session: SessionUser) {
  if (session.activeCompany.code !== "SYSTRON") return false;
  return (
    ADMIN_ROLES.has(session.role) ||
    session.role === "GERENTE_OPERATIVO_SYSTRON" ||
    session.role === "VENTAS_SYSTRON" ||
    session.role === "ALMACEN_SYSTRON" ||
    session.role === "SUPERVISOR_TECNICO_SYSTRON" ||
    session.role === "TECNICO_SYSTRON"
  );
}

export function canCreateEqui(session: SessionUser) {
  if (session.activeCompany.code !== "SYSTRON") return false;
  return ADMIN_ROLES.has(session.role) || session.role === "VENTAS_SYSTRON";
}

export function canViewMot(session: SessionUser) {
  if (ADMIN_ROLES.has(session.role)) return true;
  if (session.activeCompany.code === "SYSTRON") {
    return (
      session.role === "GERENTE_OPERATIVO_SYSTRON" ||
      session.role === "VENTAS_SYSTRON" ||
      session.role === "ALMACEN_SYSTRON"
    );
  }
  return (
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES" ||
    session.role === "AYUDANTE_GENERAL_SERVOMOTORES"
  );
}

export function canCreateMot(session: SessionUser) {
  if (session.activeCompany.code === "SYSTRON") {
    return ADMIN_ROLES.has(session.role) || session.role === "VENTAS_SYSTRON";
  }
  return ADMIN_ROLES.has(session.role) || session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
}

export function canConfirmMotIngress(session: SessionUser) {
  return (
    session.activeCompany.code === "SERVOMOTORES" &&
    (ADMIN_ROLES.has(session.role) || session.role === "GERENTE_OPERATIVO_SERVOMOTORES")
  );
}
