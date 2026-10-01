import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Plus,
  ShoppingCart,
  Stethoscope,
  Warehouse,
  WalletCards,
  Wrench,
} from "lucide-react";
import { getSession } from "@/lib/session";
import {
  almacenSystronHomeSnapshot,
  ceoPanelSnapshot,
  coordinationPanelSnapshot,
  gerenteSmPanelSnapshot,
  gerenteSystronHomeSnapshot,
  systronTechnicalHomeSnapshot,
} from "@/lib/panel-queries";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card, EmptyState, StatusBadge } from "@/components/ui/surface";

type InboxRow = {
  id: string;
  label: string;
  detail: string;
  status: string;
  href: string;
};

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "KIOSCO_ASISTENCIA") redirect("/app/kiosco");

  const isExecutive = session.role === "CEO" || session.role === "ADMINISTRADOR";
  const isCoord = session.role === "COORDINACION_ADMIN";
  const isGerenteSm = session.role === "GERENTE_OPERATIVO_SERVOMOTORES";
  const isGerenteSystron =
    session.role === "GERENTE_OPERATIVO_SYSTRON" && session.activeCompany.code === "SYSTRON";
  const isTecnicoSystron =
    (session.role === "TECNICO_SYSTRON" || session.role === "SUPERVISOR_TECNICO_SYSTRON") &&
    session.activeCompany.code === "SYSTRON";
  const isAlmacenSystron = session.role === "ALMACEN_SYSTRON" && session.activeCompany.code === "SYSTRON";

  const [ceo, coord, gerenteSm, gerenteSystron, tecnicoSystron, almacenSystron] = await Promise.all([
    isExecutive ? ceoPanelSnapshot(session.activeCompany.id) : null,
    isCoord ? coordinationPanelSnapshot(session.activeCompany.id) : null,
    isGerenteSm ? gerenteSmPanelSnapshot(session.activeCompany.id) : null,
    isGerenteSystron ? gerenteSystronHomeSnapshot(session.activeCompany.id) : null,
    isTecnicoSystron ? systronTechnicalHomeSnapshot(session.activeCompany.id) : null,
    isAlmacenSystron ? almacenSystronHomeSnapshot(session.activeCompany.id) : null,
  ]);

  const quickActions = (() => {
    if (session.role === "VENTAS_SYSTRON") {
      return [
        { href: "/app/prospectos", label: "Nuevo prospecto", icon: Plus },
        { href: "/app/cotizaciones/nueva", label: "Nueva cotización", icon: FileText },
        { href: "/app/ventas/equipo", label: "Venta de equipo", icon: PackageCheck },
      ];
    }
    if (isAlmacenSystron) {
      return [
        { href: "/app/almacen", label: "Entradas pendientes", icon: Warehouse },
        { href: "/app/equi", label: "Equipos EQUI", icon: PackageCheck },
        { href: "/app/clientes", label: "Clientes", icon: ClipboardCheck },
      ];
    }
    if (isTecnicoSystron) {
      return [
        { href: "/app/tecnica/nueva", label: "Nueva atención", icon: Plus },
        { href: "/app/tecnica", label: "Operación técnica", icon: Wrench },
        { href: "/app/equi", label: "Consultar EQUI", icon: PackageCheck },
      ];
    }
    if (isGerenteSystron) {
      return [
        { href: "/app/tecnica", label: "Validar diagnósticos", icon: Stethoscope },
        { href: "/app/cotizaciones/pendientes", label: "Cotizaciones por precio", icon: FileText },
        { href: "/app/almacen", label: "Almacén SYSTRON", icon: Warehouse },
      ];
    }
    if (isCoord) {
      return [
        { href: "/app/finanzas", label: "Registrar documento", icon: WalletCards },
        { href: "/app/compras", label: "Procesar O.C.", icon: ShoppingCart },
        { href: "/app/rrhh", label: "Gestionar nómina", icon: ClipboardCheck },
      ];
    }
    if (isGerenteSm) {
      return [
        { href: "/app/mot/servomotores", label: "Confirmar ingreso", icon: PackageCheck },
        { href: "/app/tecnica", label: "Operación técnica", icon: Wrench },
        { href: "/app/compras", label: "Registrar compra", icon: ShoppingCart },
      ];
    }
    if (isExecutive) {
      return [
        { href: "/app/cotizaciones/pendientes", label: "Definir precios", icon: FileText },
        { href: "/app/compras", label: "Autorizar O.C.", icon: ShoppingCart },
        { href: "/app/paneles/reportes", label: "Consultar reportes", icon: ClipboardCheck },
      ];
    }
    return [
      { href: "/app/tecnica", label: "Ver operación técnica", icon: Wrench },
      { href: "/app/inventario", label: "Consultar inventario", icon: PackageCheck },
      { href: "/app/cotizaciones", label: "Ver cotizaciones", icon: FileText },
    ];
  })();

  const pendingRows: InboxRow[] = (() => {
    if (ceo) {
      return [
        ...ceo.pendingQuotes.map((item) => ({
          id: item.id,
          label: item.folio,
          detail: "Precio pendiente CEO",
          status: "PENDIENTE",
          href: `/app/cotizaciones/${item.id}`,
        })),
        ...ceo.pendingOc.map((item) => ({
          id: item.id,
          label: item.folio,
          detail: item.description ?? "Orden de compra",
          status: "PENDIENTE_AUTORIZACION",
          href: "/app/compras",
        })),
      ].slice(0, 8);
    }
    if (gerenteSystron) {
      return [
        ...gerenteSystron.pendingValidation.map((row) => ({
          id: row.attendanceId,
          label: row.equiFolio ?? "Atención",
          detail: `${row.attentionType.replaceAll("_", " ")} · validar diagnóstico`,
          status: "PENDIENTE_VALIDACION_GERENTE",
          href: `/app/tecnica/${row.attendanceId}`,
        })),
        ...gerenteSystron.pendingQuotes.map((q) => ({
          id: q.id,
          label: q.folio,
          detail: "Pendiente de precio (CEO)",
          status: "PENDIENTE_PRECIO",
          href: `/app/cotizaciones/${q.id}`,
        })),
      ].slice(0, 10);
    }
    if (tecnicoSystron) {
      return tecnicoSystron.openDiagnoses.map((row) => ({
        id: row.attendanceId,
        label: row.equiFolio ?? "Atención",
        detail: `${row.attentionType.replaceAll("_", " ")} · ${row.diagnosisStatus.replaceAll("_", " ")}`,
        status: row.diagnosisStatus,
        href: `/app/tecnica/${row.attendanceId}`,
      }));
    }
    if (almacenSystron) {
      return almacenSystron.sinEntrada.map((e) => ({
        id: e.id,
        label: e.folio,
        detail: `${e.model} · registrar entrada física`,
        status: "SIN_ENTRADA",
        href: `/app/equi/${e.id}`,
      }));
    }
    return [];
  })();

  return (
    <div>
      <PageHeader
        eyebrow={session.activeCompany.displayName}
        title={`Hola, ${session.displayName.split(" ")[0]}`}
        description="Aquí tienes el estado de tu operación y las acciones que requieren atención."
      />

      <section aria-labelledby="quick-actions">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-actions" className="text-sm font-semibold">
            Accesos rápidos
          </h2>
          <span className="text-xs text-slate-500">{session.role.replaceAll("_", " ")}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.03)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-muted text-accent">
                <Icon className="size-5" />
              </span>
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="summary">
        <h2 id="summary" className="mb-3 text-sm font-semibold">
          Resumen de hoy
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ceo && (
            <>
              <MetricCard
                label="Cotizaciones por definir"
                value={ceo.pendingQuotes.length}
                icon={FileText}
                href="/app/cotizaciones/pendientes"
              />
              <MetricCard
                label="O.C. por autorizar"
                value={ceo.pendingOc.length}
                icon={ShoppingCart}
                href="/app/compras"
                tone="amber"
              />
            </>
          )}
          {coord && (
            <>
              <MetricCard
                label="Pagos por validar"
                value={coord.paymentsPending.length}
                icon={WalletCards}
                href="/app/finanzas"
                tone="amber"
              />
              <MetricCard
                label="O.C. autorizadas"
                value={coord.purchaseOrdersAuthorized.length}
                icon={ShoppingCart}
                href="/app/compras"
              />
              <MetricCard
                label="CxC abiertas"
                value={coord.receivables.length}
                icon={FileText}
                href="/app/finanzas"
                tone="green"
              />
              <MetricCard
                label="Solicitudes"
                value={coord.documentRequests.length}
                icon={ClipboardCheck}
                href="/app/finanzas"
              />
            </>
          )}
          {gerenteSm && (
            <>
              <MetricCard
                label="Cotizaciones pendientes"
                value={gerenteSm.pendingQuotes.length}
                icon={FileText}
                href="/app/cotizaciones/pendientes"
              />
              <MetricCard
                label="Comprobaciones"
                value={gerenteSm.pendingReceipts.length}
                icon={WalletCards}
                href="/app/finanzas/comprobaciones"
                tone="amber"
              />
              <MetricCard
                label="Compras recientes"
                value={gerenteSm.purchases.length}
                icon={ShoppingCart}
                href="/app/compras"
              />
              <MetricCard
                label="Producción técnica"
                value={gerenteSm.production.length}
                icon={Wrench}
                href="/app/paneles/gerente-sm"
                tone="green"
              />
            </>
          )}
          {gerenteSystron && (
            <>
              <MetricCard
                label="Diagnósticos por validar"
                value={gerenteSystron.pendingValidation.length}
                icon={Stethoscope}
                href="/app/paneles/gerente-systron"
                tone="amber"
              />
              <MetricCard
                label="EQUI sin entrada"
                value={gerenteSystron.equiSinEntrada}
                icon={Warehouse}
                href="/app/almacen"
              />
              <MetricCard
                label="COT sin precio CEO"
                value={gerenteSystron.pendingQuotes.length}
                icon={FileText}
                href="/app/cotizaciones/pendientes"
              />
            </>
          )}
          {tecnicoSystron && (
            <>
              <MetricCard
                label="Atenciones abiertas"
                value={tecnicoSystron.openDiagnoses.length}
                icon={Wrench}
                href="/app/tecnica"
                tone="amber"
              />
              <MetricCard label="Empresa" value={session.activeCompany.code} icon={PackageCheck} tone="green" />
            </>
          )}
          {almacenSystron && (
            <>
              <MetricCard
                label="Pendientes de entrada"
                value={almacenSystron.sinEntrada.length}
                icon={Warehouse}
                href="/app/almacen"
                tone="amber"
              />
              <MetricCard label="Almacén SYSTRON" value="Activo" icon={PackageCheck} tone="green" />
            </>
          )}
          {!ceo && !coord && !gerenteSm && !gerenteSystron && !tecnicoSystron && !almacenSystron && (
            <>
              <MetricCard label="Empresa activa" value={session.activeCompany.code} icon={PackageCheck} />
              <MetricCard label="Acceso" value="Activo" hint="Sesión y permisos vigentes" icon={ClipboardCheck} tone="green" />
            </>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="inbox">
        <div className="mb-3">
          <h2 id="inbox" className="text-sm font-semibold">
            Mi bandeja
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">Pendientes ordenados para avanzar la operación.</p>
        </div>
        {pendingRows.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="size-7" />}
            title="Sin pendientes críticos"
            description="Cuando una operación requiera tu atención aparecerá aquí."
          />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {pendingRows.map((row) => (
              <Link
                key={`${row.status}-${row.id}`}
                href={row.href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent-muted text-accent">
                  <FileText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{row.label}</span>
                  <span className="block truncate text-xs text-slate-500">{row.detail}</span>
                </span>
                <StatusBadge status={row.status} />
                <ArrowRight className="size-4 text-slate-300" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
