import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileOutput, ReceiptText, Truck, Users } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { MetricCard } from "@/components/patterns/metric-card";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import { canGenerateFiscalDocuments, canViewClientBilling } from "@/lib/permissions-finance";
import { getSession } from "@/lib/session";
import {
  createInvoiceAction,
  getRemissionDetail,
  listInvoicesForQuote,
} from "../../actions";

export default async function RemisionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewClientBilling(session)) redirect("/app");

  const { id } = await params;
  const row = await getRemissionDetail(session.activeCompany.id, id);
  if (!row) notFound();

  const { remission: rem, clientName, clientId, quoteFolio, quoteId } = row;
  const linkedInvoices =
    quoteId != null ? await listInvoicesForQuote(quoteId, session.activeCompany.id) : [];
  const canCoord = canGenerateFiscalDocuments(session);

  const workflowSteps = [
    {
      id: "issued",
      label: "Remisión",
      detail: formatMxnDisplay(rem.totalMxn),
      done: true,
      current: false,
    },
    {
      id: "exit",
      label: "Salida física",
      detail: rem.allowsPhysicalExit ? "Autorizada" : "No aplica",
      done: rem.allowsPhysicalExit,
      current: false,
    },
    {
      id: "invoice",
      label: "Facturación",
      detail: rem.invoiceObligationRemains
        ? linkedInvoices.length
          ? `${linkedInvoices.length} factura(s) en cotización`
          : "Obligación pendiente"
        : "Sin obligación",
      done: !rem.invoiceObligationRemains || linkedInvoices.length > 0,
      current: rem.invoiceObligationRemains && linkedInvoices.length === 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title={rem.folio}
        description="Entrega documentada; puede habilitar salida y dejar obligación de facturar."
        breadcrumbs={[
          { label: "Finanzas", href: "/app/finanzas" },
          { label: "Remisiones", href: "/app/finanzas" },
          { label: rem.folio },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/api/documents/remision/${rem.id}`}
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

      <Card className="p-4 sm:p-5">
        <WorkflowStrip steps={workflowSteps} />
      </Card>

      <MetricCard label="Importe remisión" value={formatMxnDisplay(rem.totalMxn)} icon={ReceiptText} tone="green" />

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
        <DetailItem label="Permite salida física" value={rem.allowsPhysicalExit ? "Sí" : "No"} />
        <DetailItem label="Pendiente facturar" value={rem.invoiceObligationRemains ? "Sí" : "No"} />
        <DetailItem label="Alta" value={new Date(rem.createdAt).toLocaleString("es-MX")} />
      </DetailGrid>

      {linkedInvoices.length > 0 && (
        <SectionCard title="Facturas de la misma cotización" description="Seguimiento fiscal del tronco comercial.">
          <ul className="divide-y rounded-xl border border-border text-sm">
            {linkedInvoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="font-mono text-xs font-bold text-accent">{inv.folio}</span>
                <Link href={`/app/finanzas/facturas/${inv.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Abrir factura
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {canCoord && rem.invoiceObligationRemains && quoteId && linkedInvoices.length === 0 && (
        <SectionCard
          icon={Truck}
          title="Convertir a factura"
          description="Genera la factura timbrada con el importe de la remisión y la cotización vinculada."
          tone="accent"
        >
          <form action={createInvoiceAction} className="flex flex-wrap gap-3">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="quoteId" value={quoteId} />
            <input type="hidden" name="totalMxn" value={rem.totalMxn} />
            <input type="hidden" name="contractTotalMxn" value={rem.totalMxn} />
            <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Generar factura desde remisión
            </button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
