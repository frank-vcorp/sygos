import type { SessionUser } from "@/lib/session";
import { canConfigureIntegrations } from "@/lib/permissions";
import { canManageOperationalUsers } from "@/lib/permissions-users";
import {
  canConfirmMotIngress,
  canManageSystronWarehouse,
  canViewEqui,
  canViewMot,
  isSystronTechnicalRole,
} from "@/lib/permissions-activos";

export type NavIcon =
  | "home"
  | "users"
  | "target"
  | "factory"
  | "package"
  | "wrench"
  | "file"
  | "cart"
  | "wallet"
  | "heart"
  | "chart"
  | "settings"
  | "shield"
  | "clock";

export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavGroup = { label: string; items: NavItem[] };

export function buildNavigation(session: SessionUser): NavGroup[] {
  const commercial: NavItem[] = [
    { href: "/app/clientes", label: "Clientes", icon: "users" },
    { href: "/app/prospectos", label: "Prospectos", icon: "target" },
  ];
  const assets: NavItem[] = [];
  const operations: NavItem[] = [];
  const administration: NavItem[] = [];
  const insights: NavItem[] = [];
  const system: NavItem[] = [];

  if (canViewEqui(session)) assets.push({ href: "/app/equi", label: "Equipos EQUI", icon: "package" });
  if (canViewMot(session)) assets.push({ href: "/app/mot", label: "Motores MOT", icon: "factory" });
  if (canConfirmMotIngress(session)) {
    assets.push({ href: "/app/mot/servomotores", label: "Custodia SM", icon: "shield" });
  }
  if (canManageSystronWarehouse(session)) {
    assets.push({ href: "/app/almacen", label: "Almacén", icon: "package" });
  }

  operations.push({ href: "/app/tecnica", label: "Operación técnica", icon: "wrench" });
  if (!isSystronTechnicalRole(session.role) || session.role === "SUPERVISOR_TECNICO_SYSTRON") {
    operations.push({ href: "/app/cotizaciones", label: "Cotizaciones", icon: "file" });
  }
  if (!isSystronTechnicalRole(session.role)) {
    operations.push({ href: "/app/inventario", label: "Inventario", icon: "package" });
  }

  if (session.role === "KIOSCO_ASISTENCIA") {
    return [{ label: "Kiosco", items: [{ href: "/app/kiosco", label: "Asistencia", icon: "clock" }] }];
  }

  if (isSystronTechnicalRole(session.role) || session.role === "ALMACEN_SYSTRON") {
    commercial.splice(1, 1);
  }

  const purchaseRoles = [
    "ADMINISTRADOR",
    "CEO",
    "COORDINACION_ADMIN",
    "GERENTE_OPERATIVO_SYSTRON",
    "GERENTE_OPERATIVO_SERVOMOTORES",
  ];
  if (purchaseRoles.includes(session.role)) {
    operations.push(
      { href: "/app/compras", label: "Compras y O.C.", icon: "cart" },
      { href: "/app/proveedores", label: "Proveedores", icon: "factory" },
    );
  }

  if (["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) {
    administration.push(
      { href: "/app/finanzas", label: "Finanzas", icon: "wallet" },
      { href: "/app/rrhh", label: "Capital humano", icon: "heart" },
    );
  }

  if (session.role === "CEO" || session.role === "ADMINISTRADOR") {
    insights.push({ href: "/app/paneles/ceo", label: "Panel ejecutivo", icon: "chart" });
  }
  if (["COORDINACION_ADMIN", "ADMINISTRADOR", "CEO"].includes(session.role)) {
    insights.push({ href: "/app/paneles/coordinacion", label: "Coordinación", icon: "chart" });
  }
  if (["GERENTE_OPERATIVO_SERVOMOTORES", "CEO", "ADMINISTRADOR"].includes(session.role)) {
    insights.push({ href: "/app/paneles/gerente-sm", label: "Gerencia SM", icon: "chart" });
  }
  if (
    ["GERENTE_OPERATIVO_SYSTRON", "CEO", "ADMINISTRADOR"].includes(session.role) &&
    session.activeCompany.code === "SYSTRON"
  ) {
    insights.push({ href: "/app/paneles/gerente-systron", label: "Gerencia SYSTRON", icon: "chart" });
  }
  if (purchaseRoles.includes(session.role)) {
    insights.push({ href: "/app/paneles/reportes", label: "Reportes", icon: "chart" });
  }

  if (session.role === "VENTAS_SYSTRON") {
    commercial.unshift({ href: "/app/paneles/ventas", label: "Mis ventas", icon: "chart" });
    commercial.push(
      { href: "/app/ventas/equipo", label: "Venta de equipo", icon: "package" },
      { href: "/app/ventas/campo", label: "Servicio en campo", icon: "wrench" },
    );
  }

  if (session.role === "ADMINISTRADOR") {
    system.push({ href: "/app/kiosco", label: "Kiosco", icon: "clock" });
  }
  if (canManageOperationalUsers(session.role)) {
    system.push({ href: "/app/usuarios", label: "Usuarios", icon: "users" });
  }
  if (session.role === "ADMINISTRADOR" || session.role === "CEO") {
    system.push({ href: "/app/configuracion", label: "Configuración", icon: "settings" });
  }
  if (canConfigureIntegrations(session.role)) {
    system.push({ href: "/app/integraciones", label: "Integraciones", icon: "settings" });
  }

  const groups: NavGroup[] = [
    { label: "Comercial", items: commercial },
    { label: "Activos", items: assets },
    { label: "Operación", items: operations },
    { label: "Administración", items: administration },
    { label: "Análisis", items: insights },
    { label: "Sistema", items: system },
  ];
  return groups.filter((group) => group.items.length > 0);
}
