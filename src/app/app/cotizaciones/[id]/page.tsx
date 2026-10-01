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
  Stethoscope,
  Truck,
  Users,
  Wrench,
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
import { canManageClients } from "@/lib/permissions";
import { getSession, switchActiveCompany } from "@/lib/session";
import { addClientContactAction } from "../../maestros/actions";
import {
  canApplyQuoteDiscount,
  canEditQuoteCommercialContext,
  canSeeSupplierCost,
  canSetQuotePrice,
} from "@/lib/permissions-commercial";
import { CommercialQuoteCaptureForm } from "@/components/commercial/commercial-quote-capture-form";
import { QUOTE_LINE_KIND_LABEL, QUOTE_OFFER_TYPE_LABEL } from "@/lib/quote-commercial-labels";
import { deriveEquipmentMode } from "@/lib/quote-commercial-persist";
import {
  listActiveContactsForCompany,
  listEquiOptionsForCommercial,
  listMotOptionsForCommercial,
} from "@/lib/quote-commercial-queries";
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
  listPaymentsForQuote,
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
  listQuoteIntendedContacts,
  listQuoteLines,
  sendQuoteAction,
  setQuotePriceAction,
  updateQuoteCommercialContextAction,
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

export default async function CotizacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contactId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const { contactId: preselectedContactId } = await searchParams;
  const quote = await getQuoteDetailForSession(session, id);
  if (!quote) notFound();
  if (quote.companyId !== session.activeCompany.id && canSwitchActiveCompany(session.role)) {
    await switchActiveCompany(session.id, quote.companyId);
    redirect(`/app/cotizaciones/${id}`);
  }
  const authorized =
    quote.status === "AUTORIZADA" || quote.status === "AUTORIZADA_PENDIENTE_INGRESO_EQUIPO";
  const canEditContext = canEditQuoteCommercialContext(session.role, quote);
  const [contacts, origin, intercoPartner, quoteInvoices, quoteRemissions, quoteDocRequests, quotePayments, quoteLines, intendedContacts, captureBundle] =
    await Promise.all([
      listContactsForClient(quote.clientId),
      getQuoteOriginLinks(quote.attendanceId),
      getIntercompanyQuotePartner(quote.id),
      authorized ? listInvoicesForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
      authorized ? listRemissionsForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
      authorized ? listDocumentRequestsForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
      authorized ? listPaymentsForQuote(quote.id, session.activeCompany.id) : Promise.resolve([]),
      listQuoteLines(quote.id),
      listQuoteIntendedContacts(quote.id),
      canEditContext
        ? Promise.all([
            listActiveContactsForCompany(session.activeCompany.id),
            listEquiOptionsForCommercial(session.activeCompany.id),
            listMotOptionsForCommercial(session.activeCompany.code),
          ])
        : Promise.resolve(null),
    ]);
  const intendedContactIds = intendedContacts.map((c) => c.contactId);
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
          label="Tipo de oferta"
          value={quote.offerType ? (QUOTE_OFFER_TYPE_LABEL[quote.offerType] ?? quote.offerType) : "—"}
        />
        <DetailItem
          label="Referencia comercial"
          value={quote.commercialReference?.trim() || "—"}
        />
        {quote.commercialNotes?.trim() && (
          <DetailItem label="Observaciones" value={quote.commercialNotes} className="sm:col-span-2" />
        )}
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
        {quote.equiId && (
          <DetailItem
            label="EQUI vinculado"
            value={
              <Link href={`/app/equi/${quote.equiId}`} className="font-mono text-accent hover:underline">
                Ver equipo
              </Link>
            }
          />
        )}
        {quote.motId && (
          <DetailItem
            label="MOT vinculado"
            value={
              <Link href={`/app/mot/${quote.motId}`} className="font-mono text-accent hover:underline">
                Ver MOT
              </Link>
            }
          />
        )}
        {(quote.preliminaryBrand || quote.preliminaryModel || quote.preliminarySerial || quote.preliminaryNotes) && (
          <DetailItem
            label="Equipo preliminar"
            value={
              [
                quote.preliminaryBrand,
                quote.preliminaryModel,
                quote.preliminarySerial ? `Serie ${quote.preliminarySerial}` : null,
                quote.preliminaryNotes,
              ]
                .filter(Boolean)
                .join(" · ") || "—"
            }
            className="sm:col-span-2"
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
        {origin?.diagnosisStatus && (
          <DetailItem
            label="Diagnóstico"
            value={
              <span>
                {origin.diagnosisStatus.replaceAll("_", " ")}
                {origin.diagnosisId && (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={`/app/tecnica/${origin.attendanceId}`} className="text-accent hover:underline">
                      Ver atención
                    </Link>
                  </>
                )}
              </span>
            }
          />
        )}
        {origin?.repairStatus && (
          <DetailItem label="Reparación" value={origin.repairStatus.replaceAll("_", " ")} />
        )}
      </DetailGrid>

      {(quoteLines.length > 0 || intendedContacts.length > 0) && (
        <SectionCard
          icon={FileOutput}
          title="Solicitud comercial capturada"
          description="Líneas y contactos previstos al iniciar la cotización (Discovery §20.3)."
          tone="muted"
        >
          {quoteLines.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Descripción</th>
                    <th className="py-2 text-right">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteLines.map((line) => (
                    <tr key={line.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 text-slate-600">{QUOTE_LINE_KIND_LABEL[line.kind] ?? line.kind}</td>
                      <td className="py-2 pr-3">{line.description}</td>
                      <td className="py-2 text-right font-mono">{line.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {intendedContacts.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500">Contactos previstos</p>
              {intendedContacts.map((c) => (
                <li key={c.contactId}>
                  {c.name}
                  {c.email && <span className="text-slate-500"> · {c.email}</span>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {canEditContext && captureBundle && (
        <SectionCard
          icon={Inbox}
          title="Editar contexto comercial"
          description="Mientras no haya precio CEO ni atención técnica origen, puedes ajustar líneas, equipo y contactos."
          tone="accent"
        >
          <CommercialQuoteCaptureForm
            clients={[{ id: quote.clientId, name: quote.clientName, isIntercompany: quote.clientIsIntercompany }]}
            contacts={captureBundle[0]}
            equiOptions={captureBundle[1]}
            motOptions={captureBundle[2]}
            canCreateClient={false}
            formAction={updateQuoteCommercialContextAction}
            cancelHref={`/app/cotizaciones/${quote.id}`}
            lockClientId={quote.clientId}
            quoteId={quote.id}
            fixedOfferType={quote.offerType ?? undefined}
            submitLabel="Guardar contexto"
            defaults={{
              offerType: quote.offerType ?? undefined,
              commercialReference: quote.commercialReference ?? undefined,
              commercialNotes: quote.commercialNotes ?? undefined,
              equipmentMode: deriveEquipmentMode(quote),
              equiId: quote.equiId ?? undefined,
              motId: quote.motId ?? undefined,
              preliminaryBrand: quote.preliminaryBrand ?? undefined,
              preliminaryModel: quote.preliminaryModel ?? undefined,
              preliminarySerial: quote.preliminarySerial ?? undefined,
              preliminaryNotes: quote.preliminaryNotes ?? undefined,
              lines: quoteLines.map((l) => ({
                kind: l.kind,
                description: l.description,
                quantity: l.quantity,
              })),
              intendedContactIds,
            }}
          />
        </SectionCard>
      )}

      {origin && (origin.serviceOrders.length > 0 || origin.diagnosisStatus || origin.repairStatus) && (
        <SectionCard
          icon={Stethoscope}
          title="Operación técnica vinculada"
          description="Órdenes de servicio y estados del flujo que originó esta cotización."
          tone="muted"
        >
          <ul className="space-y-2 text-sm">
            {origin.serviceOrders.map((os) => (
              <li key={os.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span>
                  <Wrench className="mr-1 inline size-3.5 text-slate-500" />
                  <span className="font-mono text-xs font-bold text-accent">{os.folio}</span>
                  <StatusBadge status={os.status} className="ml-2" />
                </span>
                <Link href={`/app/tecnica/${origin.attendanceId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Atención técnica
                </Link>
              </li>
            ))}
            {!origin.serviceOrders.length && (
              <li className="text-slate-500">
                Sin OS registrada ·{" "}
                <Link href={`/app/tecnica/${origin.attendanceId}`} className="text-accent hover:underline">
                  Abrir atención
                </Link>
              </li>
            )}
          </ul>
        </SectionCard>
      )}

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
          {quotePayments.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Pagos registrados</p>
              <ul className="mb-4 divide-y rounded-xl border border-border text-sm">
                {quotePayments.map(({ payment: pay, invoiceFolio, invoiceId }) => (
                  <li key={pay.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span>
                      {formatMxnDisplay(pay.amountMxn)} · {pay.validationStatus.replaceAll("_", " ")}
                      <span className="text-slate-500"> · factura </span>
                      <Link href={`/app/finanzas/facturas/${invoiceId}`} className="font-mono text-xs text-accent hover:underline">
                        {invoiceFolio}
                      </Link>
                    </span>
                    <span className="text-xs text-slate-500">{new Date(pay.paidAt).toLocaleDateString("es-MX")}</span>
                  </li>
                ))}
              </ul>
            </>
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
            <div className="space-y-4">
              <EmptyState
                title="Sin contactos en el cliente"
                description={
                  quote.clientIsIntercompany
                    ? "Cliente intercompañía: registra el envío interno sin destinatarios externos."
                    : "Alta rápida: captura un contacto mínimo y regresa aquí con el destinatario listo."
                }
              />
              {quote.clientIsIntercompany && (
                <form action={sendQuoteAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <input type="hidden" name="sendEmail" value="on" />
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                    Enviar cotización ahora
                  </button>
                </form>
              )}
              {canManageClients(session.role, session.activeCompany.code) && !quote.clientIsIntercompany && (
                <form action={addClientContactAction} className="grid gap-2 rounded-xl border border-border p-4">
                  <input type="hidden" name="clientId" value={quote.clientId} />
                  <input type="hidden" name="returnTo" value={`/app/cotizaciones/${quote.id}`} />
                  <p className="text-xs font-semibold uppercase text-slate-500">Crear contacto</p>
                  <Input name="name" required placeholder="Nombre" className="!mt-0" />
                  <Input name="email" type="email" placeholder="Correo" className="!mt-0" />
                  <Input name="phone" placeholder="Teléfono / WhatsApp" className="!mt-0" />
                  <label className="flex items-center gap-2 text-sm">
                    <input name="makePrimary" type="checkbox" defaultChecked />
                    Principal
                  </label>
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                    Guardar y volver
                  </button>
                </form>
              )}
              <Link href={`/app/clientes/${quote.clientId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ficha completa del cliente
              </Link>
            </div>
          ) : (
            <>
              {canManageClients(session.role, session.activeCompany.code) && (
                <form action={addClientContactAction} className="mb-4 grid gap-2 rounded-xl border border-dashed border-border p-3">
                  <input type="hidden" name="clientId" value={quote.clientId} />
                  <input type="hidden" name="returnTo" value={`/app/cotizaciones/${quote.id}`} />
                  <p className="text-xs font-semibold text-slate-600">Alta rápida de contacto</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input name="name" required placeholder="Nombre" className="!mt-0 h-9 text-sm" />
                    <Input name="email" type="email" placeholder="Correo" className="!mt-0 h-9 text-sm" />
                    <Input name="phone" placeholder="Teléfono" className="!mt-0 h-9 text-sm" />
                  </div>
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Agregar contacto
                  </button>
                </form>
              )}
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
                          defaultChecked={
                            preselectedContactId
                              ? c.id === preselectedContactId
                              : intendedContactIds.includes(c.id) || c.isPrimary
                          }
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
            </>
          )}
        </SectionCard>
      )}
    </div>
  );
}
