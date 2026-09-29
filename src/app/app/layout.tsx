import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { canConfigureIntegrations, canUseGlobalSearch } from "@/lib/permissions";
import { canManageOperationalUsers } from "@/lib/permissions-users";
import { canConfirmMotIngress, canViewEqui, canViewMot } from "@/lib/permissions-activos";
import { ActiveCompanyNotice } from "@/components/active-company-notice";
import { CompanySwitcher } from "@/components/company-switcher";
import { GlobalSearch } from "@/components/global-search";
import { IntegrationNotice } from "@/components/integration-notice";
import { listIntegrations } from "./maestros/actions";
import { logoutAction } from "../login/actions";

const nav = [
  { href: "/app", label: "Inicio" },
  { href: "/app/clientes", label: "Clientes" },
  { href: "/app/prospectos", label: "Prospectos" },
  { href: "/app/proveedores", label: "Proveedores" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const integrations = await listIntegrations(session.activeCompany.id);

  const navItems = [...nav];
  if (canViewEqui(session)) navItems.push({ href: "/app/equi", label: "EQUI" });
  if (canViewMot(session)) navItems.push({ href: "/app/mot", label: "MOT" });
  if (canConfirmMotIngress(session)) {
    navItems.push({ href: "/app/mot/servomotores", label: "Custodia SM" });
  }
  if (session.activeCompany.code === "SYSTRON") {
    navItems.push({ href: "/app/almacen", label: "Almacén" });
  }
  navItems.push(
    { href: "/app/inventario", label: "Inventario" },
    { href: "/app/tecnica", label: "Técnica" },
    { href: "/app/cotizaciones", label: "Cotizaciones" },
    { href: "/app/compras", label: "Compras" },
  );
  if (["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) {
    navItems.push({ href: "/app/finanzas", label: "Finanzas" }, { href: "/app/rrhh", label: "RRHH" });
  }
  if (session.role === "CEO" || session.role === "ADMINISTRADOR") {
    navItems.push({ href: "/app/paneles/ceo", label: "Panel CEO" });
  }
  if (session.role === "VENTAS_SYSTRON") {
    navItems.push({ href: "/app/paneles/ventas", label: "Mis ventas" });
  }
  if (session.role === "KIOSCO_ASISTENCIA" || session.role === "ADMINISTRADOR") {
    navItems.push({ href: "/app/kiosco", label: "Kiosco" });
  }
  if (canManageOperationalUsers(session.role)) {
    navItems.push({ href: "/app/usuarios", label: "Usuarios" });
  }
  if (session.role === "ADMINISTRADOR" || session.role === "CEO") {
    navItems.push({ href: "/app/configuracion", label: "Config" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              SYGOS
            </Link>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
              {session.activeCompany.displayName}
            </span>
            <nav className="flex flex-wrap gap-2 text-sm text-slate-600">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              ))}
              {canConfigureIntegrations(session.role) && (
                <Link href="/app/integraciones" className="hover:text-accent">
                  Integraciones
                </Link>
              )}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CompanySwitcher session={session} />
            {canUseGlobalSearch(session.role) && <GlobalSearch />}
            <Link href="/app/cuenta" className="text-sm text-slate-600 hover:text-accent">
              Mi cuenta
            </Link>
            <span className="text-sm text-slate-600">{session.displayName}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-accent underline-offset-2 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <ActiveCompanyNotice session={session} />
      <IntegrationNotice role={session.role} rows={integrations} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
