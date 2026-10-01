import Link from "next/link";
import { redirect } from "next/navigation";
import { FileOutput, FileText, Plus, ReceiptText, WalletCards, Workflow } from "lucide-react";
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
  listInvoicesWithClients,
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
import { DataTable } from "@/components/patterns/data-table";
import { MetricCard } from "@/components/patterns/metric-card";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input, Select } from "@/components/ui/form-fields";
import { EmptyState, StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";

export default async function FinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const canCoord = canGenerateFiscalDocuments(session);
  const canRequest = canRequestInvoice(session) || canRequestRemission(session);
  if (!canCoord && !canRequest) redirect("/app");

  const companyId = session.activeCompany.id;
  const [invoiceRows, clients, requests, remissions, pendingPay, receivables, fiscal] = await Promise.all([
    canCoord ? listInvoicesWithClients(companyId) : Promise.resolve([]),
    listClientsForSelect(companyId),
    listDocumentRequests(companyId),
    canCoord ? listRemissions(companyId) : Promise.resolve([]),
    canCoord ? listPendingPayments(companyId) : Promise.resolve([]),
    canCoord ? listReceivables(companyId) : Promise.resolve([]),
    getFiscalIdentity(companyId),
  ]);

  const openCxC = receivables.reduce((s, r) => s + r.openMxn, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Finanzas"
        description={`${fiscal.fiscalLegalName ?? "Sin razón social"} · RFC ${fiscal.fiscalRfc ?? "—"}`}
        actions={
          <Link href="/app/integraciones" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Integraciones fiscales
          </Link>
        }
      />

      {canCoord && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Facturas" value={invoiceRows.length} icon={FileText} href="/app/finanzas" />
          <MetricCard label="Remisiones" value={remissions.length} icon={ReceiptText} tone="green" />
          <MetricCard label="Pagos por validar" value={pendingPay.length} icon={WalletCards} tone="amber" />
          <MetricCard
            label="CxC abierta"
            value={formatMxnDisplay(openCxC)}
            hint={`${receivables.length} partidas`}
            icon={Workflow}
          />
        </div>
      )}

      {canRequest && (
        <SectionCard
          icon={Plus}
          title="Solicitar documento"
          description="El equipo de coordinación recibirá la solicitud en esta misma vista."
        >
          <form action={requestDocumentAction} className="grid gap-4 sm:grid-cols-3">
            <Field label="Tipo">
              <Select name="requestType" required>
                {canRequestInvoice(session) && <option value="FACTURA">Factura</option>}
                {canRequestRemission(session) && <option value="REMISION">Remisión</option>}
              </Select>
            </Field>
            <Field label="Cliente">
              <Select name="clientId" required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <FormActions className="sm:items-end">
              <button type="submit" className={buttonVariants({ variant: "primary" })}>Enviar solicitud</button>
            </FormActions>
          </form>
        </SectionCard>
      )}

      {requests.length > 0 && (
        <DataTable title="Solicitudes en curso" description="Pendientes de atención por coordinación">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Tipo</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 font-medium">{r.requestType}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {canCoord && (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard icon={FileText} title="Nueva factura" description="Vinculada a cliente y contrato cuando aplique.">
            <form action={createInvoiceAction} className="grid gap-3">
              <Field label="Cliente">
                <Select name="clientId" required>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Total MXN">
                  <Input name="totalMxn" type="number" required min={0} />
                </Field>
                <Field label="Total contrato (parcial)" hint="Opcional">
                  <Input name="contractTotalMxn" type="number" min={0} />
                </Field>
              </div>
              <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Generar factura</button>
            </form>
          </SectionCard>

          <SectionCard icon={ReceiptText} title="Remisión" description="Control de entrega; puede autorizar salida física.">
            <form action={createRemissionAction} className="grid gap-3">
              <Field label="Cliente">
                <Select name="clientId" required>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Valor referencia MXN">
                <Input name="totalMxn" type="number" required min={0} />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input name="allowsExit" type="checkbox" className="rounded" />
                Autoriza salida física
              </label>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Crear remisión</button>
            </form>
          </SectionCard>

          <SectionCard title="Factura libre" description="Sin operación de origen en Sygos." tone="muted">
            <form action={createFreeInvoiceAction} className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente" className="sm:col-span-2">
                <Select name="clientId" required>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Total MXN">
                <Input name="totalMxn" type="number" required min={0} />
              </Field>
              <FormActions>
                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Factura libre</button>
              </FormActions>
            </form>
          </SectionCard>

          {session.activeCompany.code === "SERVOMOTORES" && (
            <SectionCard title="Intercompañía" description="CxC Servomotores / CxP SYSTRON." tone="muted">
              <form action={intercompanyInvoiceAction} className="flex flex-wrap items-end gap-3">
                <Field label="Importe MXN">
                  <Input name="amountMxn" type="number" required min={0} className="w-40" />
                </Field>
                <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Facturar a SYSTRON</button>
              </form>
            </SectionCard>
          )}
          {session.activeCompany.code === "SYSTRON" && (
            <SectionCard title="Pago a Servomotores" tone="muted">
              <form action={intercompanyPaymentAction} className="flex flex-wrap items-end gap-3">
                <Field label="Importe MXN">
                  <Input name="amountMxn" type="number" required min={0} className="w-40" />
                </Field>
                <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Registrar pago</button>
              </form>
            </SectionCard>
          )}
          <SectionCard title="Crédito anticipado" description="Saldo a favor del cliente." tone="muted">
            <form action={addCustomerCreditAction} className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente">
                <Select name="clientId" required>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Monto MXN">
                <Input name="amountMxn" type="number" required min={0} />
              </Field>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Registrar crédito</button>
            </form>
          </SectionCard>
          <SectionCard title="Aplicar crédito" tone="muted">
            <form action={applyCustomerCreditAction} className="grid gap-3">
              <Field label="Cliente">
                <Select name="clientId" required>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Factura">
                <Select name="invoiceId" required>
                  {invoiceRows.map(({ invoice: i }) => <option key={i.id} value={i.id}>{i.folio}</option>)}
                </Select>
              </Field>
              <Field label="Monto MXN">
                <Input name="amountMxn" type="number" required min={0} />
              </Field>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Aplicar a factura</button>
            </form>
          </SectionCard>
        </div>
      )}

      <DataTable
        title="Facturas"
        description={canCoord ? "Timbrado Facturapi, documento comercial y cobranza" : "Consulta con tu coordinador"}
        actions={
          invoiceRows.length > 0 ? (
            <span className="text-xs text-slate-500">{invoiceRows.length} registros</span>
          ) : null
        }
      >
        {invoiceRows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Sin facturas" description="Genera la primera desde las tarjetas de arriba." />
          </div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Folio</th>
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoiceRows.map(({ invoice: i, clientName }) => (
                <tr key={i.id} className="align-top hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-mono text-xs font-semibold">
                    <Link href={`/app/finanzas/facturas/${i.id}`} className="text-accent hover:underline">
                      {i.folio}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{clientName}</td>
                  <td className="px-5 py-4 font-medium">{formatMxnDisplay(i.totalMxn)}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={i.status} />
                    {i.lastStampError && (
                      <p className="mt-1 max-w-xs text-xs text-red-700">{i.lastStampError}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/api/documents/factura/${i.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <FileOutput className="size-3.5" />
                        Documento
                      </Link>
                      {canCoord && i.lastStampError && (
                        <form action={retryStampAction}>
                          <input type="hidden" name="invoiceId" value={i.id} />
                          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                            Reintentar timbrado
                          </button>
                        </form>
                      )}
                      {(canRegisterPayment(session) || canCoord) && (
                        <form action={registerPaymentAction} className="flex gap-1">
                          <input type="hidden" name="invoiceId" value={i.id} />
                          <Input name="amountMxn" type="number" placeholder="Pago" className="!mt-0 h-8 w-24 py-1 text-xs" />
                          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Cobrar</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>

      {canCoord && pendingPay.length > 0 && (
        <DataTable title="Pagos por validar" description="Confirma antes de aplicar a CxC">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {pendingPay.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-medium">{formatMxnDisplay(p.amountMxn)}</td>
                  <td className="px-5 py-3 text-right">
                    <form action={validatePaymentAction} className="inline">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Validar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {remissions.length > 0 && (
        <DataTable title="Remisiones">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Folio</th>
                <th className="px-5 py-3">Importe</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {remissions.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-mono text-xs">
                    <Link href={`/app/finanzas/remisiones/${r.id}`} className="text-accent hover:underline">
                      {r.folio}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{formatMxnDisplay(r.totalMxn)} {r.allowsPhysicalExit && <span className="text-xs text-slate-500">· salida</span>}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/api/documents/remision/${r.id}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Ver documento
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      <p className="text-xs text-slate-500">
        <Link href="/app/paneles/reportes" className="font-medium text-accent hover:underline">Reportes por empresa</Link>
      </p>
    </div>
  );
}
