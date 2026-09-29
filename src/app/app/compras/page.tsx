import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canAccessPurchases, canAuthorizePurchaseOrder, canProcessPurchaseOrder } from "@/lib/permissions-purchases";
import { listSuppliers } from "../maestros/actions";
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras — {session.activeCompany.displayName}</h1>
      <p className="rounded border bg-slate-50 p-3 text-sm">
        Mes {budget.month}: usado ${budget.usedMxn} / ${budget.monthlyBudgetMxn} · máx. directa ${budget.maxDirectMxn}.
        El sobrante no se acumula al mes siguiente.
      </p>
      <form action={createPurchaseAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
        <input name="description" required placeholder="Descripción" className="rounded border px-2 py-1 text-sm" />
        <input name="amountMxn" type="number" required placeholder="MXN" className="rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Registrar compra</button>
      </form>
      <form action={createPurchaseOrderAction} className="flex flex-wrap gap-2 rounded border border-dashed p-4 text-sm">
        <input name="description" required placeholder="O.C. descripción" className="rounded border px-2 py-1" />
        <input name="amountMxn" type="number" required placeholder="MXN" className="rounded border px-2 py-1" />
        <button type="submit" className="rounded border px-3 py-1">Nueva O.C.</button>
      </form>
      <h2 className="font-medium">Compras</h2>
      <ul className="text-sm">
        {rows.map((p) => (
          <li key={p.id} className="border-b py-2">
            {p.description} — ${p.amountMxn} — {p.status} ({p.calendarMonth})
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
      <h2 className="font-medium">Órdenes de compra</h2>
      <ul className="text-sm">
        {orders.map((o) => (
          <li key={o.id} className="border-b py-2">
            {o.folio} — {o.description} — ${o.amountMxn} — {o.status}
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
    </div>
  );
}
