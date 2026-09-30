"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  Clock3,
  Factory,
  FileText,
  HeartHandshake,
  Home,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Users,
  WalletCards,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { NavGroup, NavIcon } from "@/lib/app-navigation";
import type { SessionUser } from "@/lib/session";
import { cn } from "@/lib/cn";
import { CompanySwitcher } from "@/components/company-switcher";
import { GlobalSearch } from "@/components/global-search";
import { ViewAsSwitcher } from "@/components/view-as-switcher";
import type { ViewAsOption } from "@/lib/impersonation";
import { SygosLogo } from "@/components/brand/sygos-logo";
import { logoutAction } from "@/app/login/actions";

const icons: Record<NavIcon, LucideIcon> = {
  home: Home,
  users: Users,
  target: Target,
  factory: Factory,
  package: Package,
  wrench: Wrench,
  file: FileText,
  cart: ShoppingCart,
  wallet: WalletCards,
  heart: HeartHandshake,
  chart: BarChart3,
  settings: Settings,
  shield: ShieldCheck,
  clock: Clock3,
};

function Navigation({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-3">
      <Link
        href="/app"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          pathname === "/app"
            ? "bg-white/12 text-white shadow-sm"
            : "text-[var(--sidebar-muted)] hover:bg-white/7 hover:text-white",
        )}
      >
        <Home className="size-[18px]" />
        Inicio
      </Link>
      {groups.map((group) => (
        <section key={group.label}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = icons[item.icon];
              const active =
                pathname === item.href ||
                (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-white/12 text-white shadow-sm"
                      : "text-[var(--sidebar-muted)] hover:bg-white/7 hover:text-white",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppShell({
  session,
  groups,
  canSearch,
  notices,
  viewAsOptions,
  children,
}: {
  session: SessionUser;
  groups: NavGroup[];
  canSearch: boolean;
  notices?: ReactNode;
  viewAsOptions?: ViewAsOption[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  const role = session.role.replaceAll("_", " ");
  const initials = session.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (pathname.startsWith("/app/kiosco") && session.role === "KIOSCO_ASISTENCIA") {
    return (
      <div className="min-h-screen bg-[var(--sidebar)] p-4 sm:p-8">
        <header className="mx-auto flex max-w-3xl items-center justify-between text-white">
          <SygosLogo href="/app/kiosco" variant="brand" size="md" />
          <form action={logoutAction}>
            <button className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              <LogOut className="size-4" /> Salir
            </button>
          </form>
        </header>
        <main className="mx-auto mt-6 max-w-3xl rounded-3xl bg-background p-5 shadow-2xl sm:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:pl-[272px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-[var(--sidebar)] lg:flex">
        <SygosLogo
          href="/app"
          variant="lockup"
          fill
          centered
          className="shrink-0 border-b border-slate-200 bg-white px-3 py-4"
        />
        <Navigation groups={groups} pathname={pathname} />
        <div className="border-t border-white/8 p-4">
          <div className="rounded-xl bg-white/6 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Empresa activa</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{session.activeCompany.displayName}</p>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col bg-[var(--sidebar)] shadow-2xl">
            <div className="relative shrink-0 bg-white">
              <SygosLogo
                href="/app"
                variant="lockup"
                fill
                centered
                className="px-3 py-3.5 pr-12"
              />
              <button
                type="button"
                aria-label="Cerrar navegación"
                className="absolute right-2 top-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <Navigation groups={groups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-border bg-white/92 backdrop-blur-xl">
        <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Abrir navegación"
            className="rounded-xl border border-border p-2.5 text-slate-600 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-500">Espacio de trabajo</p>
            <p className="truncate text-sm font-semibold text-foreground">{session.activeCompany.displayName}</p>
          </div>
          <div className="hidden xl:block">{canSearch && <GlobalSearch />}</div>
          {canSearch && (
            <Link
              href="/app"
              aria-label="Buscar"
              className="rounded-xl border border-border p-2.5 text-slate-500 hover:bg-slate-50 xl:hidden"
            >
              <Search className="size-5" />
            </Link>
          )}
          <div className="hidden md:block">
            <CompanySwitcher session={session} />
          </div>
          {viewAsOptions && viewAsOptions.length > 0 && (
            <div className="hidden lg:block">
              <ViewAsSwitcher
                options={viewAsOptions}
                effectiveUserId={session.id}
                impersonating={Boolean(session.impersonator)}
              />
            </div>
          )}
          <div className="relative">
            <button
              onClick={() => setUserOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-border bg-white p-1.5 pr-2 hover:bg-slate-50"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden max-w-36 text-left sm:block">
                <span className="block truncate text-xs font-semibold">{session.displayName}</span>
                <span className="block truncate text-[10px] text-slate-500">{role}</span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
            </button>
            {userOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-xl">
                <Link
                  href="/app/cuenta"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Settings className="size-4 text-slate-400" />
                  Mi cuenta
                </Link>
                <form action={logoutAction}>
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-muted">
                    <LogOut className="size-4" />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2 border-t border-border px-4 py-2 lg:hidden">
          <CompanySwitcher session={session} />
          {viewAsOptions && viewAsOptions.length > 0 && (
            <ViewAsSwitcher
              options={viewAsOptions}
              effectiveUserId={session.id}
              impersonating={Boolean(session.impersonator)}
            />
          )}
        </div>
      </header>

      {notices}
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
