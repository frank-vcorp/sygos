import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign, ClipboardList, Gauge, ShoppingCart } from "lucide-react";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import { quickCreateHref } from "@/lib/quick-create-return";
import { canAccessPurchases, canAuthorizePurchaseOrder, canProcessPurchaseOrder } from "@/lib/permissions-purchases";
import { listSuppliers } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { DataTable } from "@/components/patterns/data-table";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import {
  authorizePurchaseOrderAction,
  cancelDirectPurchaseAction,
  cancelPurchaseOrderAction,
  createPurchaseAction,
  createPurchaseOrderAction,
  editDirectPurchaseAction,
  editPurchaseOrderAction,
  getPurchaseBudgetSummary,
  listPurchaseOrders,
  listPurchases,
  processPurchaseOrderAction,
  validateDirectPurchaseAction,
} from "./actions";

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessPurchases(session)) redirect("/app");

  const { supplierId: preselectedSupplierId } = await searchParams;
  const companyId = session.activeCompany.id;
  const [rows, orders, budget, suppliers] = await Promise.all([
    listPurchases(companyId),
    listPurchaseOrders(companyId),
    getPurchaseBudgetSummary(companyId),
    canProcessPurchaseOrder(session) ? listSuppliers(companyId) : Promise.resolve([]),
  ]);
  const pendingOc = orders.filter((o) => o.status === "PENDIENTE_AUTORIZACION").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Abastecimiento"
        title="Compras y órdenes"
        description={`Control presupuestal y autorizaciones de ${session.activeCompany.displayName}.`}
        actions={
          canManageSuppliers(session.role) && canProcessPurchaseOrder(session) ? (
            <Link
              href={quickCreateHref("/app/proveedores/nuevo", "/app/compras")}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Nuevo proveedor
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Presupuesto mensual" value={formatMxnDisplay(budget.monthlyBudgetMxn)} hint={budget.month} icon={Gauge} />
        <MetricCard label="Utilizado" value={formatMxnDisplay(budget.usedMxn)} icon={CircleDollarSign} tone="amber" />
        <MetricCard label="Máx. compra directa" value={formatMxnDisplay(budget.maxDirectMxn)} icon={ShoppingCart} />
        <MetricCard label="O.C. por autorizar" value={pendingOc} icon={ClipboardList} tone={pendingOc ? "amber" : "blue"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard icon={ShoppingCart} title="Compra directa" description="Gastos dentro del límite autorizado." tone="accent">
          <form action={createPurchaseAction} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <Field label="Descripción">
              <Input name="description" required placeholder="Concepto del gasto" />
            </Field>
            <Field label="MXN">
              <Input name="amountMxn" type="number" required min={0} />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Registrar</button>
          </form>
        </SectionCard>
        <SectionCard icon={ClipboardList} title="Nueva orden de compra" description="Pasa por autorización del CEO cuando aplique.">
          <form action={createPurchaseOrderAction} className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <Field label="Descripción">
              <Input name="description" required placeholder="Detalle de la O.C." />
            </Field>
            <Field label="MXN">
              <Input name="amountMxn" type="number" required min={0} />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Crear O.C.</button>
          </form>
        </SectionCard>
      </div>

      <DataTable title="Compras directas" description={`${rows.length} movimientos en el periodo`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Concepto</th>
              <th className="px-5 py-3 text-left font-semibold">Importe</th>
              <th className="px-5 py-3 text-left font-semibold">Estado</th>
              <th className="px-5 py-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id} className="align-top hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link href={`/app/compras/movimientos/${p.id}`} className="font-semibold text-accent hover:underline">
                    {p.description}
                  </Link>
                  <p className="text-xs text-slate-500">{p.calendarMonth}</p>
                </td>
                <td className="px-5 py-4 font-medium">{formatMxnDisplay(p.amountMxn)}</td>
                <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-4">
                  {canProcessPurchaseOrder(session) && !p.purchaseOrderId && p.status !== "CANCELADA" && p.status !== "VALIDADA" && (
                    <div className="flex flex-col gap-2">
                      <form action={validateDirectPurchaseAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="purchaseId" value={p.id} />
                        <select name="supplierId" defaultValue={preselectedSupplierId ?? ""} className="rounded-lg border border-border px-2 py-1 text-xs">
                          <option value="">Sin proveedor</option>
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select name="settlement" className="rounded-lg border border-border px-2 py-1 text-xs">
                          <option value="CXP">CxP</option>
                          <option value="EGRESO">Egreso</option>
                        </select>
                        <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Validar</button>
                      </form>
                      <form action={editDirectPurchaseAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="purchaseId" value={p.id} />
                        <Input name="description" defaultValue={p.description} className="!mt-0 h-8 max-w-[140px] py-1 text-xs" />
                        <Input name="amountMxn" type="number" defaultValue={p.amountMxn} className="!mt-0 h-8 w-20 py-1 text-xs" />
                        <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>Editar</button>
                      </form>
                      <form action={cancelDirectPurchaseAction}>
                        <input type="hidden" name="purchaseId" value={p.id} />
                        <button type="submit" className={buttonVariants({ variant: "danger", size: "sm" })}>Cancelar</button>
                      </form>
                      {p.status === "PENDIENTE_OC" && (
                        <form action={createPurchaseOrderAction}>
                          <input type="hidden" name="purchaseId" value={p.id} />
                          <input type="hidden" name="description" value={p.description} />
                          <input type="hidden" name="amountMxn" value={p.amountMxn} />
                          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Crear O.C.</button>
                        </form>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>

      <DataTable title="Órdenes de compra" description={`${orders.length} órdenes registradas`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left font-semibold">Folio</th>
              <th className="px-5 py-3 text-left font-semibold">Concepto</th>
              <th className="px-5 py-3 text-left font-semibold">Importe</th>
              <th className="px-5 py-3 text-left font-semibold">Estado</th>
              <th className="px-5 py-3 text-left font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="align-top hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link href={`/app/compras/ordenes/${o.id}`} className="font-mono text-xs font-bold text-accent hover:underline">
                    {o.folio}
                  </Link>
                </td>
                <td className="px-5 py-4 font-semibold">{o.description}</td>
                <td className="px-5 py-4">{formatMxnDisplay(o.amountMxn)}</td>
                <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-2">
                    {canAuthorizePurchaseOrder(session) && o.status === "PENDIENTE_AUTORIZACION" && (
                      <form action={authorizePurchaseOrderAction}>
                        <input type="hidden" name="purchaseOrderId" value={o.id} />
                        <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Autorizar (CEO)</button>
                      </form>
                    )}
                    {canProcessPurchaseOrder(session) && o.status === "AUTORIZADA" && (
                      <form action={processPurchaseOrderAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="purchaseOrderId" value={o.id} />
                        <select name="supplierId" defaultValue={preselectedSupplierId ?? ""} className="rounded-lg border border-border px-2 py-1 text-xs">
                          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select name="settlement" className="rounded-lg border border-border px-2 py-1 text-xs">
                          <option value="CXP">CxP</option>
                          <option value="EGRESO">Egreso</option>
                        </select>
                        <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Procesar</button>
                      </form>
                    )}
                    {canAccessPurchases(session) && o.status !== "PROCESADA" && o.status !== "CANCELADA" && (
                      <form action={editPurchaseOrderAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="purchaseOrderId" value={o.id} />
                        <Input name="description" defaultValue={o.description} className="!mt-0 h-8 max-w-[160px] text-xs" />
                        <Input name="amountMxn" type="number" defaultValue={o.amountMxn} className="!mt-0 h-8 w-20 text-xs" />
                        <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>Editar</button>
                      </form>
                    )}
                    {(canAuthorizePurchaseOrder(session) || canProcessPurchaseOrder(session)) && o.status === "AUTORIZADA" && (
                      <form action={cancelPurchaseOrderAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="purchaseOrderId" value={o.id} />
                        <Input name="cancelReason" placeholder="Motivo" className="!mt-0 h-8 max-w-[120px] text-xs" />
                        <button type="submit" className={buttonVariants({ variant: "danger", size: "sm" })}>Cancelar O.C.</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
