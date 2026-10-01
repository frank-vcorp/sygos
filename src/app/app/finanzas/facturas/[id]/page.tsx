import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banknote, FileOutput, Receipt, Users, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { MetricCard } from "@/components/patterns/metric-card";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-fields";
import { Card, StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import {
  canGenerateFiscalDocuments,
  canRegisterPayment,
  canViewClientBilling,
} from "@/lib/permissions-finance";
import { getSession } from "@/lib/session";
import {
  getInvoiceDetail,
  getReceivableForInvoice,
  listPaymentsForInvoice,
  registerPaymentAction,
  retryStampAction,
  validatePaymentAction,
} from "../../actions";

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewClientBilling(session)) redirect("/app");

  const { id } = await params;
  const row = await getInvoiceDetail(session.activeCompany.id, id);
  if (!row) notFound();

  const { invoice: inv, clientName, clientId, quoteFolio, quoteId } = row;
  const [paymentRows, receivable] = await Promise.all([
    listPaymentsForInvoice(inv.id, session.activeCompany.id),
    getReceivableForInvoice(inv.id, session.activeCompany.id),
  ]);

  const canCoord = canGenerateFiscalDocuments(session);
  const stamped = inv.status === "TIMBRADA" || Boolean(inv.facturapiUuid);
  const openMxn = receivable?.openMxn ?? 0;
  const collected = openMxn <= 0 && stamped;

  const workflowSteps = [
    {
      id: "register",
      label: "Registro",
      detail: `Total ${formatMxnDisplay(inv.totalMxn)}`,
      done: true,
      current: false,
    },
    {
      id: "stamp",
      label: "Timbrado",
      detail: inv.lastStampError
        ? "Error — reintentar"
        : stamped
          ? "CFDI timbrado"
          : "Pendiente Facturapi",
      done: stamped,
      current: !stamped && !inv.lastStampError,
    },
    {
      id: "collect",
      label: "Cobranza",
      detail: receivable ? `Saldo ${formatMxnDisplay(openMxn)}` : "Sin CxC",
      done: collected || !receivable,
      current: Boolean(receivable && openMxn > 0 && stamped),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title={inv.folio}
        description="Factura fiscal vinculada al cliente y, cuando aplica, a la cotización origen."
        breadcrumbs={[
          { label: "Finanzas", href: "/app/finanzas" },
          { label: "Facturas", href: "/app/finanzas" },
          { label: inv.folio },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={inv.status} />
            <Link
              href={`/api/documents/factura/${inv.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <FileOutput className="size-4" />
              Ver documento
            </Link>
            <Link href={`/app/clientes/${clientId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Users className="size-4" />
              Cliente
            </Link>
          </div>
        }
      />

      {inv.lastStampError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{inv.lastStampError}</p>
      )}

      <Card className="p-4 sm:p-5">
        <WorkflowStrip steps={workflowSteps} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Total factura" value={formatMxnDisplay(inv.totalMxn)} icon={Receipt} tone="green" />
        <MetricCard
          label="Contrato / parcial"
          value={inv.contractTotalMxn != null ? formatMxnDisplay(inv.contractTotalMxn) : "—"}
          hint="Tope para facturas parciales"
          icon={Banknote}
        />
        <MetricCard
          label="CxC abierta"
          value={receivable ? formatMxnDisplay(openMxn) : "—"}
          icon={WalletCards}
          tone={openMxn > 0 ? "amber" : "green"}
        />
      </div>

      <DetailGrid title="Identidad y vínculos">
        <DetailItem
          label="Cliente"
          value={
            <Link href={`/app/clientes/${clientId}`} className="text-accent hover:underline">
              {clientName}
            </Link>
          }
        />
        {quoteFolio && quoteId && (
          <DetailItem
            label="Cotización origen"
            value={
              <Link href={`/app/cotizaciones/${quoteId}`} className="font-mono text-accent hover:underline">
                {quoteFolio}
              </Link>
            }
          />
        )}
        <DetailItem label="Política contado SYSTRON" value={inv.requiresCashPolicy ? "Sí" : "No"} />
        <DetailItem label="Factura libre" value={inv.isFreeInvoice ? "Sí" : "No"} />
        <DetailItem label="Intercompañía" value={inv.isIntercompany ? "Sí" : "No"} />
        {inv.facturapiUuid && (
          <DetailItem label="UUID SAT" value={<span className="font-mono text-xs">{inv.facturapiUuid}</span>} className="sm:col-span-2" />
        )}
        <DetailItem label="Alta" value={new Date(inv.createdAt).toLocaleString("es-MX")} />
      </DetailGrid>

      {canCoord && inv.lastStampError && (
        <SectionCard title="Timbrado" description="Reintento manual tras corregir datos fiscales o Facturapi." tone="accent">
          <form action={retryStampAction}>
            <input type="hidden" name="invoiceId" value={inv.id} />
            <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Reintentar timbrado
            </button>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Pagos" description="Registro y validación de cobranza sobre esta factura." tone="default">
        {paymentRows.length === 0 ? (
          <p className="text-sm text-slate-500">Sin pagos registrados.</p>
        ) : (
          <ul className="divide-y rounded-xl border border-border text-sm">
            {paymentRows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-semibold">{formatMxnDisplay(p.amountMxn)}</span>
                  <span className="text-slate-500"> · </span>
                  <StatusBadge status={p.validationStatus} />
                  <span className="text-slate-500"> · {new Date(p.paidAt).toLocaleString("es-MX")}</span>
                </span>
                {canCoord && p.validationStatus === "PENDIENTE_VALIDACION" && (
                  <form action={validatePaymentAction}>
                    <input type="hidden" name="paymentId" value={p.id} />
                    <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                      Validar pago
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {(canRegisterPayment(session) || canCoord) && receivable && openMxn > 0 && (
          <form action={registerPaymentAction} className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <input type="hidden" name="invoiceId" value={inv.id} />
            <Field label="Importe del pago (MXN)" className="w-40">
              <Input name="amountMxn" type="number" min={1} max={openMxn} required placeholder={String(openMxn)} />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Registrar pago
            </button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
