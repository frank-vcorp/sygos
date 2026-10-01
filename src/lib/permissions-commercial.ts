import type { SessionUser } from "@/lib/session";

export function canSetQuotePrice(role: SessionUser["role"]) {
  return role === "CEO" || role === "ADMINISTRADOR";
}

export function canApplyQuoteDiscount(role: SessionUser["role"]) {
  return role === "VENTAS_SYSTRON" || role === "CEO" || role === "ADMINISTRADOR";
}

export function canSeeSupplierCost(session: SessionUser) {
  return session.activeCompany.code === "SYSTRON" && (session.role === "CEO" || session.role === "ADMINISTRADOR");
}

export function canSeeSystronMargin(session: SessionUser) {
  return session.activeCompany.code === "SERVOMOTORES" && session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
}

/** Editar contexto §20.3 mientras no hay atención técnica origen ni precio CEO. */
export function canEditQuoteCommercialContext(
  role: SessionUser["role"],
  quote: { pendingPricing: boolean; attendanceId: string | null; pendingOrigin: string | null },
) {
  if (!quote.pendingPricing || quote.attendanceId) return false;
  const sellerOrigins = ["COTIZACION_INICIADA", "VENTA_EQUIPO", "SERVICIO_EN_CAMPO"];
  if (!quote.pendingOrigin || !sellerOrigins.includes(quote.pendingOrigin)) return false;
  return (
    role === "ADMINISTRADOR" ||
    role === "CEO" ||
    role === "VENTAS_SYSTRON" ||
    role === "GERENTE_OPERATIVO_SERVOMOTORES"
  );
}
