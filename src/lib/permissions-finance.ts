import type { SessionUser } from "@/lib/session";

export function canRequestInvoice(session: SessionUser) {
  return (
    session.role === "VENTAS_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES" ||
    session.role === "CEO" ||
    session.role === "ADMINISTRADOR"
  );
}

export function canRequestRemission(session: SessionUser) {
  return canRequestInvoice(session);
}

export function canGenerateFiscalDocuments(session: SessionUser) {
  return session.role === "COORDINACION_ADMIN" || session.role === "ADMINISTRADOR" || session.role === "CEO";
}

export function canValidatePayments(session: SessionUser) {
  return canGenerateFiscalDocuments(session);
}

export function canRegisterPayment(session: SessionUser) {
  return (
    canGenerateFiscalDocuments(session) ||
    session.role === "VENTAS_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES"
  );
}
