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
