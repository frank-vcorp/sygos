import type { SessionUser } from "@/lib/session";

const MANAGER_SYSTRON = "GERENTE_OPERATIVO_SYSTRON";
const MANAGER_SM = "GERENTE_OPERATIVO_SERVOMOTORES";
const ADMIN = new Set(["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"]);

export function canManageTechnicalState(session: SessionUser, attendanceCompanyId: string) {
  if (session.activeCompany.id !== attendanceCompanyId) return false;
  if (ADMIN.has(session.role)) return true;
  if (session.activeCompany.code === "SYSTRON") {
    return (
      session.role === MANAGER_SYSTRON ||
      session.role === "SUPERVISOR_TECNICO_SYSTRON" ||
      session.role === "TECNICO_SYSTRON"
    );
  }
  return session.role === MANAGER_SM;
}

export function canValidateDiagnosis(session: SessionUser) {
  if (ADMIN.has(session.role)) return true;
  if (session.activeCompany.code === "SYSTRON") return session.role === MANAGER_SYSTRON;
  return session.role === MANAGER_SM;
}

export function canReturnDiagnosis(session: SessionUser) {
  return canValidateDiagnosis(session) && session.activeCompany.code === "SYSTRON";
}

export function canOverrideWarrantyCeo(session: SessionUser) {
  return session.role === "CEO" || session.role === "ADMINISTRADOR";
}

export function canAssignExternalService(session: SessionUser) {
  if (session.activeCompany.code !== "SYSTRON") return false;
  return (
    ADMIN.has(session.role) ||
    session.role === MANAGER_SYSTRON ||
    session.role === "SUPERVISOR_TECNICO_SYSTRON"
  );
}

/** SYSTRON no ejecuta técnica en MOT propio (salvo crear garantía en SYSTRON). */
export function assertSystronMotTechnicalRule(
  companyCode: SessionUser["activeCompany"]["code"],
  attentionType: string,
  motOriginCode: string | null,
  hasMot: boolean,
) {
  if (companyCode !== "SYSTRON" || !hasMot) return;
  if (motOriginCode !== "SYSTRON") return;
  if (attentionType === "DIAGNOSTICO_GARANTIA") return;
  throw new Error(
    "En SYSTRON no existe Diagnóstico/Reparación técnica sobre MOT SYSTRON; la ejecución es en Servomotores.",
  );
}
