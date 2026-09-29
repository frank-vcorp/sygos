import type { SessionUser } from "@/lib/session";
import type { users } from "@/db/schema";

type Role = (typeof users.$inferSelect)["role"];

export function canManageOperationalUsers(role: SessionUser["role"]) {
  return role === "ADMINISTRADOR" || role === "CEO";
}

export function canManageAdministratorAccounts(role: SessionUser["role"]) {
  return role === "ADMINISTRADOR";
}

export function canViewUserInList(targetRole: Role, session: SessionUser) {
  if (targetRole === "ADMINISTRADOR" && session.role !== "ADMINISTRADOR") {
    return false;
  }
  return true;
}

export function canAssignRole(session: SessionUser, role: Role) {
  if (role === "ADMINISTRADOR") return session.role === "ADMINISTRADOR";
  return canManageOperationalUsers(session.role);
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRADOR: "Administrador",
  CEO: "CEO",
  COORDINACION_ADMIN: "Coordinación de Administración",
  GERENTE_OPERATIVO_SYSTRON: "Gerente Operativo SYSTRON",
  GERENTE_OPERATIVO_SERVOMOTORES: "Gerente Operativo Servomotores",
  SUPERVISOR_TECNICO_SYSTRON: "Supervisor Técnico SYSTRON",
  TECNICO_SYSTRON: "Técnico SYSTRON",
  VENTAS_SYSTRON: "Ventas SYSTRON",
  ALMACEN_SYSTRON: "Almacén SYSTRON",
  AYUDANTE_GENERAL_SERVOMOTORES: "Ayudante General Servomotores",
  KIOSCO_ASISTENCIA: "Kiosco de Asistencia",
};

export const MULTI_COMPANY_ROLES = new Set<Role>(["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"]);
