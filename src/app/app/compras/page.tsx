import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canAccessPurchases, canAuthorizePurchaseOrder, canProcessPurchaseOrder } from "@/lib/permissions-purchases";
import { listSuppliers } from "../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { Card, StatusBadge } from "@/components/ui/surface";
import { CircleDollarSign, Gauge, ShoppingCart } from "lucide-react";
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

export default async function ComprasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessPurchases(session)) redirect("/app");

  const companyId = session.activeCompany.id;
  const [rows, orders, budget, suppliers] = await Promise.all([
    listPurchases(companyId),
    listPurchaseOrders(companyId),
    getPurchaseBudgetSummary(companyId),
    canProcessPurchaseOrder(session) ? listSuppliers(companyId) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Abastecimiento"
        title="Compras y órdenes"
        description={`Control presupuestal y autorizaciones de ${session.activeCompany.displayName}.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Presupuesto mensual" value={`$${budget.monthlyBudgetMxn}`} hint={budget.month} icon={Gauge} />
        <MetricCard label="Presupuesto utilizado" value={`$${budget.usedMxn}`} icon={CircleDollarSign} tone="amber" />
        <MetricCard label="Máximo compra directa" value={`$${budget.maxDirectMxn}`} icon={ShoppingCart} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Registrar compra directa</h2>
          <p className="mt-1 text-xs text-slate-500">Para gastos dentro del límite autorizado.</p>
          <form action={createPurchaseAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <input name="description" required placeholder="Descripción de la compra" />
            <input name="amountMxn" type="number" required placeholder="Importe MXN" />
            <button type="submit" className="rounded-lg bg-accent px-4 text-sm font-semibold text-white">Registrar</button>
          </form>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Nueva orden de compra</h2>
          <p className="mt-1 text-xs text-slate-500">Solicitud sujeta al flujo de autorización.</p>
          <form action={createPurchaseOrderAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <input name="description" required placeholder="Descripción de la O.C." />
            <input name="amountMxn" type="number" required placeholder="Importe MXN" />
            <button type="submit" className="rounded-lg border border-border bg-white px-4 text-sm font-semibold">Crear O.C.</button>
          </form>
        </Card>
      </div>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Compras directas</h2>
          <p className="text-xs text-slate-500">{rows.length} movimientos en el periodo</p>
        </div>
        <ul className="divide-y text-sm">
        {rows.map((p) => (
          <li key={p.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{p.description}</span>
              <span className="text-slate-500">${p.amountMxn} · {p.calendarMonth}</span>
              <StatusBadge status={p.status} />
            </div>
            {canProcessPurchaseOrder(session) && !p.purchaseOrderId && p.status !== "CANCELADA" && p.status !== "VALIDADA" && (
              <div className="mt-1 flex flex-wrap gap-2">
                <form action={validateDirectPurchaseAction} className="flex gap-1">
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <select name="supplierId" className="rounded border text-xs">
                    <option value="">Sin proveedor</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select name="settlement" className="rounded border text-xs">
                    <option value="CXP">CxP</option>
                    <option value="EGRESO">Egreso</option>
                  </select>
                  <button type="submit" className="text-xs text-accent">Validar</button>
                </form>
                <form action={editDirectPurchaseAction} className="flex gap-1">
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <input name="description" defaultValue={p.description} className="w-32 rounded border text-xs" />
                  <input name="amountMxn" type="number" defaultValue={p.amountMxn} className="w-20 rounded border text-xs" />
                  <button type="submit" className="text-xs">Editar</button>
                </form>
                <form action={cancelDirectPurchaseAction}>
                  <input type="hidden" name="purchaseId" value={p.id} />
                  <button type="submit" className="text-xs text-red-700">Cancelar</button>
                </form>
                {p.status === "PENDIENTE_OC" && (
                  <form action={createPurchaseOrderAction} className="flex gap-1">
                    <input type="hidden" name="purchaseId" value={p.id} />
                    <input type="hidden" name="description" value={p.description} />
                    <input type="hidden" name="amountMxn" value={p.amountMxn} />
                    <button type="submit" className="text-xs text-accent">Crear O.C.</button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
        </ul>
      </Card>
      <Card className="mt-6 overflow-hidden">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Órdenes de compra</h2>
          <p className="text-xs text-slate-500">{orders.length} órdenes registradas</p>
        </div>
        <ul className="divide-y text-sm">
        {orders.map((o) => (
          <li key={o.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent">{o.folio}</span>
              <span className="font-semibold">{o.description}</span>
              <span className="text-slate-500">${o.amountMxn}</span>
              <StatusBadge status={o.status} />
            </div>
            {canAuthorizePurchaseOrder(session) && o.status === "PENDIENTE_AUTORIZACION" && (
              <form action={authorizePurchaseOrderAction} className="inline ml-2">
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <button type="submit" className="text-xs text-accent">Autorizar (CEO)</button>
              </form>
            )}
            {canProcessPurchaseOrder(session) && o.status === "AUTORIZADA" && (
              <form action={processPurchaseOrderAction} className="mt-1 flex gap-1">
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <select name="supplierId" className="rounded border text-xs">
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select name="settlement" className="rounded border text-xs">
                  <option value="CXP">CxP</option>
                  <option value="EGRESO">Egreso</option>
                </select>
                <button type="submit" className="text-xs text-accent">Procesar</button>
              </form>
            )}
            {canAccessPurchases(session) && o.status !== "PROCESADA" && o.status !== "CANCELADA" && (
              <form action={editPurchaseOrderAction} className="mt-1 flex gap-1 text-xs">
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <input name="description" defaultValue={o.description} className="rounded border" />
                <input name="amountMxn" type="number" defaultValue={o.amountMxn} className="w-20 rounded border" />
                <button type="submit">Editar O.C.</button>
              </form>
            )}
            {(canAuthorizePurchaseOrder(session) || canProcessPurchaseOrder(session)) && o.status === "AUTORIZADA" && (
              <form action={cancelPurchaseOrderAction} className="mt-1 flex gap-1">
                <input type="hidden" name="purchaseOrderId" value={o.id} />
                <input name="cancelReason" placeholder="Motivo" className="rounded border text-xs" />
                <button type="submit" className="text-xs">Cancelar O.C.</button>
              </form>
            )}
          </li>
        ))}
        </ul>
      </Card>
    </div>
  );
}
