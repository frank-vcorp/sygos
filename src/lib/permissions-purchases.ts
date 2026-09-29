import type { SessionUser } from "@/lib/session";

export function canAccessPurchases(session: SessionUser) {
  return (
    session.role === "ADMINISTRADOR" ||
    session.role === "CEO" ||
    session.role === "COORDINACION_ADMIN" ||
    session.role === "GERENTE_OPERATIVO_SYSTRON" ||
    session.role === "GERENTE_OPERATIVO_SERVOMOTORES"
  );
}

export function canAuthorizePurchaseOrder(session: SessionUser) {
  return session.role === "CEO" || session.role === "ADMINISTRADOR";
}

export function canProcessPurchaseOrder(session: SessionUser) {
  return session.role === "COORDINACION_ADMIN" || session.role === "ADMINISTRADOR" || session.role === "CEO";
}

export function canEditDirectPurchase(session: SessionUser) {
  return canProcessPurchaseOrder(session);
}
