import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../activos/actions";
import {
  addCustomerCreditAction,
  applyCustomerCreditAction,
  createFreeInvoiceAction,
  createInvoiceAction,
  createRemissionAction,
  getFiscalIdentity,
  intercompanyInvoiceAction,
  intercompanyPaymentAction,
  listDocumentRequests,
  listInvoices,
  listPendingPayments,
  listReceivables,
  listRemissions,
  registerPaymentAction,
  requestDocumentAction,
  retryStampAction,
  validatePaymentAction,
} from "./actions";
import {
  canGenerateFiscalDocuments,
  canRegisterPayment,
  canRequestInvoice,
  canRequestRemission,
} from "@/lib/permissions-finance";

export default async function FinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const canCoord = canGenerateFiscalDocuments(session);
  const canRequest = canRequestInvoice(session) || canRequestRemission(session);
  if (!canCoord && !canRequest) redirect("/app");

  const companyId = session.activeCompany.id;
  const [invoices, clients, requests, remissions, pendingPay, receivables, fiscal] = await Promise.all([
    canCoord ? listInvoices(companyId) : Promise.resolve([]),
    listClientsForSelect(companyId),
    listDocumentRequests(companyId),
    canCoord ? listRemissions(companyId) : Promise.resolve([]),
    canCoord ? listPendingPayments(companyId) : Promise.resolve([]),
    canCoord ? listReceivables(companyId) : Promise.resolve([]),
    getFiscalIdentity(companyId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finanzas — {session.activeCompany.displayName}</h1>
      <p className="text-sm text-slate-600">
        Identidad fiscal: {fiscal.fiscalLegalName ?? "Sin razón social"} · RFC {fiscal.fiscalRfc ?? "—"}. Solo empresa
        activa.
      </p>

      {canRequest && (
        <form action={requestDocumentAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
          <select name="requestType" className="rounded border px-2 py-1 text-sm">
            {canRequestInvoice(session) && <option value="FACTURA">Solicitar factura</option>}
            {canRequestRemission(session) && <option value="REMISION">Solicitar remisión</option>}
          </select>
          <select name="clientId" required className="rounded border px-2 py-1 text-sm">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Enviar solicitud</button>
        </form>
      )}

      {requests.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">Solicitudes pendientes</h2>
          <ul>
            {requests.map((r) => (
              <li key={r.id} className="border-b py-1">{r.requestType} — {r.status}</li>
            ))}
          </ul>
        </section>
      )}

      {canCoord && (
        <>
          <form action={createInvoiceAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
            <span className="w-full text-xs font-medium text-slate-500">Generar factura</span>
            <select name="clientId" required className="rounded border px-2 py-1 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="totalMxn" type="number" required placeholder="Total MXN" className="rounded border px-2 py-1 text-sm" />
            <input name="contractTotalMxn" type="number" placeholder="Total contrato" className="rounded border px-2 py-1 text-sm" />
            <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Factura</button>
          </form>
          <form action={createFreeInvoiceAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
            <span className="w-full text-xs text-slate-500">Factura libre (sin operación)</span>
            <select name="clientId" required className="rounded border px-2 py-1 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="totalMxn" type="number" required className="rounded border px-2 py-1 text-sm" />
            <button type="submit" className="rounded border px-3 py-1 text-sm">Factura libre</button>
          </form>
          <form action={createRemissionAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
            <select name="clientId" required className="rounded border px-2 py-1 text-sm">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="totalMxn" type="number" required className="rounded border px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-sm">
              <input name="allowsExit" type="checkbox" /> Salida física
            </label>
            <button type="submit" className="rounded border px-3 py-1 text-sm">Remisión</button>
          </form>
          {session.activeCompany.code === "SERVOMOTORES" && (
            <form action={intercompanyInvoiceAction} className="flex gap-2 rounded border border-dashed p-4 text-sm">
              <input name="amountMxn" type="number" placeholder="Factura intercompañía a SYSTRON" required />
              <button type="submit" className="rounded bg-accent px-3 py-1 text-white">CxC/CxP</button>
            </form>
          )}
          {session.activeCompany.code === "SYSTRON" && (
            <form action={intercompanyPaymentAction} className="flex gap-2 rounded border border-dashed p-4 text-sm">
              <input name="amountMxn" type="number" placeholder="Pago parcial a Servomotores" required />
              <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Registrar pago</button>
            </form>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <form action={addCustomerCreditAction} className="rounded border p-3 text-sm">
              <p className="mb-2 font-medium">Crédito anticipado cliente</p>
              <select name="clientId" className="mb-1 w-full rounded border px-2 py-1">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input name="amountMxn" type="number" className="mb-1 w-full rounded border px-2 py-1" />
              <button type="submit" className="text-accent">Registrar crédito</button>
            </form>
            <form action={applyCustomerCreditAction} className="rounded border p-3 text-sm">
              <p className="mb-2 font-medium">Aplicar crédito a factura</p>
              <select name="clientId" className="mb-1 w-full rounded border px-2 py-1">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select name="invoiceId" className="mb-1 w-full rounded border px-2 py-1">
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.folio}</option>)}
              </select>
              <input name="amountMxn" type="number" className="mb-1 w-full rounded border px-2 py-1" />
              <button type="submit" className="text-accent">Aplicar</button>
            </form>
          </div>
        </>
      )}

      <section>
        <h2 className="font-medium">Facturas</h2>
        <ul className="text-sm">
          {invoices.map((i) => (
            <li key={i.id} className="border-b py-2">
              {i.folio} — ${i.totalMxn} — {i.status}
              {i.requiresCashPolicy && <span className="ml-2 text-amber-700">Política efectivo SYSTRON</span>}
              {i.lastStampError && (
                <span className="ml-2 text-red-700">Timbrado: {i.lastStampError}</span>
              )}
              {canCoord && i.lastStampError && (
                <form action={retryStampAction} className="inline ml-2">
                  <input type="hidden" name="invoiceId" value={i.id} />
                  <button type="submit" className="text-xs text-accent">Reintentar timbrado</button>
                </form>
              )}
              {(canRegisterPayment(session) || canCoord) && (
                <form action={registerPaymentAction} className="mt-1 flex gap-1">
                  <input type="hidden" name="invoiceId" value={i.id} />
                  <input name="amountMxn" type="number" placeholder="Pago MXN" className="w-24 rounded border px-1" />
                  <button type="submit" className="text-xs text-accent">Registrar pago</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canCoord && pendingPay.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">Pagos por validar</h2>
          <ul>
            {pendingPay.map((p) => (
              <li key={p.id} className="flex items-center gap-2 border-b py-1">
                ${p.amountMxn}
                <form action={validatePaymentAction}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <button type="submit" className="text-accent">Validar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canCoord && receivables.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">CxC abiertas</h2>
          <ul>
            {receivables.map((r) => (
              <li key={r.id}>Factura {r.invoiceId.slice(0, 8)}… — ${r.openMxn}</li>
            ))}
          </ul>
        </section>
      )}

      {remissions.length > 0 && (
        <section className="text-sm">
          <h2 className="font-medium">Remisiones</h2>
          <ul>
            {remissions.map((r) => (
              <li key={r.id}>{r.folio} — ${r.totalMxn} {r.allowsPhysicalExit && "· salida"}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-500">
        <Link href="/app/paneles/reportes" className="text-accent">Reportes por empresa</Link>
      </p>
    </div>
  );
}
