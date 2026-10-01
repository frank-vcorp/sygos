import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Banknote,
  FileOutput,
  Gavel,
  Inbox,
  Percent,
  Send,
  Receipt,
  Truck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { MetricCard } from "@/components/patterns/metric-card";
import { SectionCard } from "@/components/patterns/section-card";
import { WorkflowStrip } from "@/components/patterns/workflow-strip";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input } from "@/components/ui/form-fields";
import { Card, EmptyState, StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import { canSwitchActiveCompany } from "@/lib/permissions-company";
import { getSession, switchActiveCompany } from "@/lib/session";
import { canApplyQuoteDiscount, canSeeSupplierCost, canSetQuotePrice } from "@/lib/permissions-commercial";
import {
  canGenerateFiscalDocuments,
  canRequestInvoice,
  canRequestRemission,
} from "@/lib/permissions-finance";
import {
  createInvoiceAction,
  createRemissionAction,
  listDocumentRequestsForQuote,
  listInvoicesForQuote,
  listRemissionsForQuote,
  requestDocumentAction,
} from "../../finanzas/actions";
import {
  applyQuoteDiscountAction,
  authorizeWithoutEquipmentAction,
  getIntercompanyQuotePartner,
  getQuoteDetailForSession,
  getQuoteOriginLinks,
  recordQuoteClientDecisionAction,
  listContactsForClient,
  sendQuoteAction,
  setQuotePriceAction,
} from "../actions";

const ORIGIN_LABEL: Record<string, string> = {
  COTIZACION_INICIADA: "Cotización iniciada",
  DIAGNOSTICO_VALIDADO: "Diagnóstico validado",
  REPARACION_PENDIENTE_PRECIO: "Reparación pendiente de precio",
  GARANTIA_NO_PROCEDENTE: "Garantía no procedente",
  MOT_INTERCOMPANIA: "MOT intercompañía",
  VENTA_EQUIPO: "Venta de equipo",
  SERVICIO_EN_CAMPO: "Servicio en campo",
};

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const quote = await getQuoteDetailForSession(session, id);
  if (!quote) notFound();
  if (quote.companyId !== session.activeCompany.id && canSwitchActiveCompany(session.role)) {
    await switchActiveCompany(session.id, quote.companyId);
    redirect(`/app/cotizaciones/${id}`);
  }
  const authorized =
    quote.status === "AUTORIZADA" || quote.status === "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO";
  const [contacts, origin, intercoPartner, quoteInvoices, quoteRemissions, quoteDocRequests] = await Promise.all([
    listContactsForClient(quote.clientId),
    getQuoteOriginLinks(quote.attendanceId),
    getIntercompanyQuotePartner(quote.id),
    authorized ? listInvoicesForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
    authorized ? listRemissionsForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
    authorized ? listDocumentRequestsForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
  ]);
  const fiscalDone = quoteInvoices.length > 0 || quoteRemissions.length > 0;
  const showSupplierCost = canSeeSupplierCost(session);
  const hideCostFromVendedor = session.role === "VENTAS_SYSTRON";
  const hasPrice = quote.finalPriceMxn != null || quote.priceMxn != null;
  const displayTotal = quote.finalPriceMxn ?? quote.priceMxn;

  const workflowSteps = [
    {
      id: "price",
      label: "Precio",
      detail: quote.pendingPricing ? "CEO/Admin debe fijar importe" : `Total ${formatMxnDisplay(displayTotal)}`,
      done: !quote.pendingPricing && hasPrice,
      current: quote.pendingPricing,
    },
    {
      id: "send",
      label: "Envío",
      detail: quote.status === "ENVIADA" ? "Documento enviado al cliente" : "Selecciona contactos y canales",
      done: ["ENVIADA", "AUTORIZADA", "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO", "RECHAZADA"].includes(quote.status),
      current: hasPrice && quote.status !== "ENVIADA" && !quote.pendingPricing,
    },
    {
      id: "decision",
      label: "Decisión",
      detail:
        quote.status === "AUTORIZADA" || quote.status === "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO"
          ? "Cliente autorizó"
          : quote.status === "RECHAZADA"
            ? "Cliente no autorizó"
            : "Pendiente respuesta del cliente",
      done: ["AUTORIZADA", "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO", "RECHAZADA"].includes(quote.status),
      current: quote.status === "ENVIADA",
    },
    {
      id: "fiscal",
      label: "Fiscal",
      detail: fiscalDone
        ? `${quoteInvoices.length} factura(s) · ${quoteRemissions.length} remisión(es)`
        : authorized
          ? "Solicitar o generar factura / remisión"
          : "Tras autorización del cliente",
      done: fiscalDone,
      current: authorized && !fiscalDone,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title={quote.folio}
        description={
          quote.pendingPricing
            ? "Bandeja pendiente de cotizar — falta precio para enviar al cliente."
            : "Seguimiento comercial, envío de documento y decisión del cliente."
        }
        breadcrumbs={[{ label: "Cotizaciones", href: "/app/cotizaciones" }, { label: quote.folio }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quote.status} />
            {hasPrice && (
              <Link
                href={`/api/documents/cotizacion/${quote.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <FileOutput className="size-4" />
                Ver documento
              </Link>
            )}
            <Link href={`/app/clientes/${quote.clientId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ir al cliente
            </Link>
          </div>
        }
      />

      <Card className="p-4 sm:p-5">
        <WorkflowStrip steps={workflowSteps} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Precio final"
          value={formatMxnDisplay(displayTotal)}
          hint="Lo que ve el cliente en el PDF"
          icon={Banknote}
          tone={hasPrice ? "green" : "amber"}
        />
        <MetricCard
          label="Descuento"
          value={quote.discountPercent ? `${quote.discountPercent}%` : "Sin descuento"}
          icon={Percent}
        />
        <MetricCard
          label="Origen"
          value={quote.pendingOrigin ? (ORIGIN_LABEL[quote.pendingOrigin] ?? quote.pendingOrigin) : "Directo"}
          hint="Bandeja de pendientes"
          icon={Inbox}
        />
        <MetricCard label="Contactos activos" value={contacts.length} hint="Destinatarios de envío" icon={Users} />
      </div>

      <DetailGrid title="Resumen" description="Contexto comercial de la cotización">
        <DetailItem
          label="Cliente"
          value={
            <Link href={`/app/clientes/${quote.clientId}`} className="text-accent hover:underline">
              {quote.clientName}
            </Link>
          }
        />
        <DetailItem
          label="Referencia comercial"
          value={quote.commercialReference?.trim() || "—"}
        />
        {!hideCostFromVendedor && quote.priceMxn != null && (
          <DetailItem label="Precio base" value={formatMxnDisplay(quote.priceMxn)} />
        )}
        {showSupplierCost && quote.systronSupplierCostMxn != null && (
          <DetailItem label="Base Servomotores (CEO)" value={formatMxnDisplay(quote.systronSupplierCostMxn)} />
        )}
        {intercoPartner && (
          <DetailItem
            label="Cotización espejo (interco)"
            value={
              intercoPartner.companyId === session.activeCompany.id ? (
                <Link href={`/app/cotizaciones/${intercoPartner.id}`} className="font-mono text-accent hover:underline">
                  {intercoPartner.folio}
                </Link>
              ) : canSwitchActiveCompany(session.role) ? (
                <Link href={`/app/cotizaciones/${intercoPartner.id}`} className="font-mono text-accent hover:underline">
                  {intercoPartner.folio} ({intercoPartner.companyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"})
                </Link>
              ) : (
                <span className="font-mono text-slate-700">
                  {intercoPartner.folio} · {intercoPartner.companyCode === "SYSTRON" ? "SYSTRON" : "Servomotores"}
                </span>
              )
            }
          />
        )}
        {quote.authorizedWithoutEquipment && (
          <DetailItem label="Equipo físico" value="Autorizada — pendiente ingreso" />
        )}
        {origin && (
          <DetailItem
            label="Atención origen"
            value={
              <Link href={`/app/tecnica/${origin.attendanceId}`} className="text-accent hover:underline">
                {origin.attentionType.replaceAll("_", " ")}
              </Link>
            }
          />
        )}
        {origin?.equiId && origin.equiFolio && (
          <DetailItem
            label="EQUI"
            value={
              <Link href={`/app/equi/${origin.equiId}`} className="font-mono text-accent hover:underline">
                {origin.equiFolio}
              </Link>
            }
          />
        )}
        {origin?.motId && origin.motFolio && (
          <DetailItem
            label="MOT"
            value={
              <Link href={`/app/mot/${origin.motId}`} className="font-mono text-accent hover:underline">
                {origin.motFolio}
              </Link>
            }
          />
        )}
      </DetailGrid>

      {canSetQuotePrice(session.role) && quote.pendingPricing && (
        <SectionCard
          icon={Banknote}
          title="Fijar precio"
          description="Solo CEO o Administrador. El vendedor podrá enviar y dar seguimiento después."
          tone="accent"
        >
          <form action={setQuotePriceAction} className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            <input type="hidden" name="quoteId" value={quote.id} />
            <Field label="Precio al cliente (MXN)" hint="Antes de IVA, según política comercial">
              <Input name="priceMxn" type="number" required min={0} placeholder="Ej. 12000" />
            </Field>
            {showSupplierCost && (
              <Field label="Costo base SM (opcional)" hint="Solo visible para CEO/Admin SYSTRON">
                <Input name="systronSupplierCostMxn" type="number" min={0} placeholder="Referencia interna" />
              </Field>
            )}
            <FormActions className="sm:col-span-2">
              <button type="submit" className={buttonVariants({ variant: "primary" })}>Guardar precio</button>
            </FormActions>
          </form>
        </SectionCard>
      )}

      {canApplyQuoteDiscount(session.role) && quote.priceMxn != null && (
        <SectionCard icon={Percent} title="Descuento comercial" description="Respeta el tope del vendedor si aplica.">
          <form action={applyQuoteDiscountAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="quoteId" value={quote.id} />
            <Field label="% descuento" className="w-32">
              <Input name="discountPercent" type="number" min={0} max={100} placeholder="0" />
            </Field>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Aplicar al total
            </button>
          </form>
        </SectionCard>
      )}

      {canSetQuotePrice(session.role) && (
        <SectionCard
          icon={Truck}
          title="Sin equipo en almacén"
          description="Autoriza la operación antes del ingreso físico de EQUI/MOT (Discovery §20.6)."
          tone="muted"
        >
          <form action={authorizeWithoutEquipmentAction}>
            <input type="hidden" name="quoteId" value={quote.id} />
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Marcar: autorizada pendiente de ingreso
            </button>
          </form>
        </SectionCard>
      )}

      {quote.status === "ENVIADA" && (
        <SectionCard
          icon={Gavel}
          title="Decisión del cliente"
          description="Registra si el cliente autorizó o rechazó la propuesta enviada."
          tone="accent"
        >
          <div className="flex flex-wrap gap-2">
            <form action={recordQuoteClientDecisionAction}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="decision" value="AUTORIZADA" />
              <button type="submit" className={buttonVariants({ variant: "primary" })}>Cliente autoriza</button>
            </form>
            <form action={recordQuoteClientDecisionAction}>
              <input type="hidden" name="quoteId" value={quote.id} />
              <input type="hidden" name="decision" value="RECHAZADA" />
              <button type="submit" className={buttonVariants({ variant: "secondary" })}>Cliente rechaza</button>
            </form>
          </div>
        </SectionCard>
      )}

      {authorized && (
        <SectionCard
          icon={Receipt}
          title="Documentos fiscales"
          description="Cola comercial → coordinación. Factura timbrada o remisión según política del cliente."
          tone={fiscalDone ? "default" : "accent"}
        >
          {quoteInvoices.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Facturas</p>
              <ul className="mb-4 divide-y rounded-xl border border-border text-sm">
                {quoteInvoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span>
                      <span className="font-mono text-xs font-bold text-accent">{inv.folio}</span>
                      <span className="text-slate-500"> · </span>
                      <StatusBadge status={inv.status} />
                      <span className="text-slate-600"> · {formatMxnDisplay(inv.totalMxn)}</span>
                    </span>
                    <Link href={`/app/finanzas/facturas/${inv.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir factura
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {quoteRemissions.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Remisiones</p>
              <ul className="mb-4 divide-y rounded-xl border border-border text-sm">
                {quoteRemissions.map((rem) => (
                  <li key={rem.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{rem.folio}</span>
                      <span className="text-slate-600">{formatMxnDisplay(rem.totalMxn)}</span>
                      {rem.allowsPhysicalExit && (
                        <span className="text-xs text-emerald-700">Salida física</span>
                      )}
                      {rem.invoiceObligationRemains && (
                        <span className="text-xs text-amber-700">Pendiente facturar</span>
                      )}
                    </span>
                    <Link href={`/app/finanzas/remisiones/${rem.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir remisión
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {quoteDocRequests.length > 0 && (
            <ul className="mb-4 space-y-1 text-xs text-slate-600">
              {quoteDocRequests.map((r) => (
                <li key={r.id}>
                  Solicitud {r.requestType.replaceAll("_", " ")} ·{" "}
                  {new Date(r.createdAt).toLocaleString("es-MX")}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            {canRequestInvoice(session) && (
              <form action={requestDocumentAction}>
                <input type="hidden" name="clientId" value={quote.clientId} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="requestType" value="FACTURA" />
                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Solicitar factura
                </button>
              </form>
            )}
            {canRequestRemission(session) && (
              <form action={requestDocumentAction}>
                <input type="hidden" name="clientId" value={quote.clientId} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="requestType" value="REMISION" />
                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Solicitar remisión
                </button>
              </form>
            )}
            {canGenerateFiscalDocuments(session) && displayTotal != null && quoteInvoices.length === 0 && (
              <form action={createInvoiceAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="clientId" value={quote.clientId} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="totalMxn" value={displayTotal} />
                <input type="hidden" name="contractTotalMxn" value={displayTotal} />
                <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                  Generar factura (coord.)
                </button>
              </form>
            )}
            {canGenerateFiscalDocuments(session) && displayTotal != null && (
              <form action={createRemissionAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="clientId" value={quote.clientId} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="totalMxn" value={displayTotal} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="allowsExit" />
                  Permite salida física
                </label>
                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Generar remisión (coord.)
                </button>
              </form>
            )}
          </div>
        </SectionCard>
      )}

      {quote.finalPriceMxn != null && (
        <SectionCard
          icon={Send}
          title="Enviar documento"
          description="Correo con PDF adjunto (SendGrid) y/o WhatsApp. Configura integraciones si aparece aviso en la barra superior."
          tone="accent"
        >
          {contacts.length === 0 ? (
            <EmptyState
              title="Sin contactos en el cliente"
              description="Agrega al menos un contacto con correo o teléfono en la ficha del cliente."
              action={
                <Link href={`/app/clientes/${quote.clientId}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                  Gestionar contactos
                </Link>
              }
            />
          ) : (
            <form action={sendQuoteAction} className="space-y-4">
              <input type="hidden" name="quoteId" value={quote.id} />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destinatarios</p>
                <ul className="divide-y rounded-xl border border-border bg-slate-50/50">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <label className="flex flex-1 cursor-pointer items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          name="contactIds"
                          value={c.id}
                          defaultChecked={c.isPrimary}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-semibold">{c.name}</span>
                          {c.isPrimary && (
                            <span className="ml-2 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                              Principal
                            </span>
                          )}
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {[c.email, c.phone].filter(Boolean).join(" · ") || "Sin correo ni teléfono"}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" name="sendEmail" defaultChecked />
                  Correo (SendGrid)
                </label>
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" name="sendWhatsapp" />
                  WhatsApp
                </label>
              </div>
              <button type="submit" className={buttonVariants({ variant: "primary" })}>
                Enviar cotización ahora
              </button>
            </form>
          )}
        </SectionCard>
      )}
    </div>
  );
}
