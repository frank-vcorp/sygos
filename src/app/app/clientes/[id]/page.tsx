import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Cpu, FileText, Receipt, ReceiptText, Stethoscope } from "lucide-react";
import { formatMxnDisplay } from "@/lib/format-currency";
import { canViewClientBilling } from "@/lib/permissions-finance";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, StatusBadge } from "@/components/ui/surface";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import {
  canCreateEqui,
  canViewEqui,
  listAttendancesForClientViaEqui,
  listEquiForClient,
} from "../../activos/actions";
import { listQuotesForClient } from "../../cotizaciones/actions";
import { listInvoicesForClient, listRemissionsForClient } from "../../finanzas/actions";
import {
  addClientContactAction,
  cancelClientAction,
  getClient,
  getClientContacts,
  getEntityHistory,
  listClientCommunications,
  logClientCommunicationAction,
  removeClientContactAction,
  setPrimaryClientContactAction,
  updateClientAction,
} from "../../maestros/actions";

const ATT_LABEL: Record<string, string> = {
  DIAGNOSTICO: "Diagnóstico",
  REPARACION: "Reparación preautorizada",
  DIAGNOSTICO_GARANTIA: "Diagnóstico garantía",
};

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conflict?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { conflict } = await searchParams;
  const client = await getClient(session.activeCompany.id, id);
  if (!client || !client.active) notFound();

  const contacts = await getClientContacts(client.id);
  const communications = await listClientCommunications(client.id, session.activeCompany.id);
  const history = await getEntityHistory("CLIENT", client.id);
  const canEdit = canManageClients(session.role, session.activeCompany.code) && !client.isIntercompany;
  const showSystronOps = canViewEqui(session);

  const [equiRows, attendanceRows, quoteRows] = showSystronOps
    ? await Promise.all([
        listEquiForClient(client.id, session.activeCompany.id),
        listAttendancesForClientViaEqui(client.id, session.activeCompany.id),
        listQuotesForClient(client.id, session.activeCompany.id),
      ])
    : [[], [], []];

  const pendingQuotes = quoteRows.filter((q) => q.pendingPricing);
  const showBilling = canViewClientBilling(session);

  const [invoiceRows, remissionRows] = showBilling
    ? await Promise.all([
        listInvoicesForClient(client.id, session.activeCompany.id),
        listRemissionsForClient(client.id, session.activeCompany.id),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comercial"
        title={client.name}
        description={client.folio ? `Folio ${client.folio}` : undefined}
        breadcrumbs={[{ label: "Clientes", href: "/app/clientes" }, { label: client.name }]}
        actions={
          showSystronOps && canCreateEqui(session) ? (
            <Link
              href={`/app/equi/nuevo?clientId=${client.id}`}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <Cpu className="size-4" />
              Nuevo EQUI
            </Link>
          ) : undefined
        }
      />

      {conflict === "1" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El registro cambió en otra sesión. Datos recargados; revisa antes de guardar.
        </p>
      )}

      <Card className="grid gap-3 p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Crédito</dt>
          <dd>{client.creditDays} días</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Requiere factura</dt>
          <dd>{client.requiresInvoice ? "Sí" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Versión</dt>
          <dd>{client.version}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Intercompañía</dt>
          <dd>{client.isIntercompany ? "Sí" : "No"}</dd>
        </div>
      </Card>

      {showSystronOps && (
        <>
          {pendingQuotes.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {pendingQuotes.length} cotización(es) de este cliente{" "}
              {pendingQuotes.length === 1 ? "requiere" : "requieren"} precio CEO.{" "}
              <Link href="/app/cotizaciones/pendientes" className="font-semibold text-accent hover:underline">
                Ver pendientes de precio
              </Link>
            </p>
          )}

          <SectionCard
            icon={Cpu}
            title="Equipos EQUI"
            description="Activos SYSTRON del cliente — entrada, técnica y cotización desde cada folio."
            tone={equiRows.length ? "default" : "muted"}
          >
            {equiRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sin equipos registrados.
                {canCreateEqui(session) && (
                  <>
                    {" "}
                    <Link
                      href={`/app/equi/nuevo?clientId=${client.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      Dar de alta un EQUI
                    </Link>
                  </>
                )}
              </p>
            ) : (
              <ul className="divide-y rounded-xl border border-border">
                {equiRows.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{e.folio}</span>
                      <span className="text-slate-600">{e.model}</span>
                      <StatusBadge status={e.warehouseStatus} />
                    </span>
                    <Link href={`/app/equi/${e.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir equipo
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            icon={Stethoscope}
            title="Atenciones técnicas"
            description="Operaciones vinculadas a los EQUI de este cliente."
            tone={attendanceRows.length ? "default" : "muted"}
          >
            {attendanceRows.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay atenciones en equipos de este cliente.</p>
            ) : (
              <ul className="divide-y rounded-xl border border-border">
                {attendanceRows.map(({ attendance: a, equiFolio, equiId }) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <Link href={`/app/equi/${equiId}`} className="font-mono text-xs font-bold text-accent hover:underline">
                        {equiFolio}
                      </Link>
                      <span className="text-slate-500"> · </span>
                      <span className="font-semibold">{ATT_LABEL[a.attentionType] ?? a.attentionType}</span>
                      <span className="text-slate-500"> · {a.reportedFault ?? "Sin falla reportada"}</span>
                    </span>
                    <Link href={`/app/tecnica/${a.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir atención
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="Cotizaciones"
            description="Comercial vinculado al cliente (técnico o iniciado en ventas)."
            tone={quoteRows.length ? "default" : "muted"}
          >
            {quoteRows.length === 0 ? (
              <p className="text-sm text-slate-500">Sin cotizaciones registradas para este cliente.</p>
            ) : (
              <ul className="divide-y rounded-xl border border-border">
                {quoteRows.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{q.folio}</span>
                      <StatusBadge status={q.status} />
                      {q.pendingPricing && <span className="text-xs text-amber-700">Pendiente de precio</span>}
                    </span>
                    <Link href={`/app/cotizaciones/${q.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir cotización
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {showBilling && (
        <>
          <SectionCard
            icon={Receipt}
            title="Facturas"
            description="Documentos fiscales del cliente; enlace a cotización origen cuando aplica."
            tone={invoiceRows.length ? "default" : "muted"}
          >
            {invoiceRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sin facturas registradas.{" "}
                <Link href="/app/finanzas" className="font-medium text-accent hover:underline">
                  Ver módulo Finanzas
                </Link>
              </p>
            ) : (
              <ul className="divide-y rounded-xl border border-border">
                {invoiceRows.map(({ invoice: inv, quoteFolio, quoteId }) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{inv.folio}</span>
                      <StatusBadge status={inv.status} />
                      <span className="text-slate-600">{formatMxnDisplay(inv.totalMxn)}</span>
                      {quoteFolio && quoteId && (
                        <Link href={`/app/cotizaciones/${quoteId}`} className="text-xs text-accent hover:underline">
                          COT {quoteFolio}
                        </Link>
                      )}
                    </span>
                    <Link href={`/app/finanzas/facturas/${inv.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir factura
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            icon={ReceiptText}
            title="Remisiones"
            description="Entregas con obligación de facturar o salida física autorizada."
            tone={remissionRows.length ? "default" : "muted"}
          >
            {remissionRows.length === 0 ? (
              <p className="text-sm text-slate-500">Sin remisiones para este cliente.</p>
            ) : (
              <ul className="divide-y rounded-xl border border-border">
                {remissionRows.map(({ remission: rem, quoteFolio, quoteId }) => (
                  <li key={rem.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{rem.folio}</span>
                      <span className="text-slate-600">{formatMxnDisplay(rem.totalMxn)}</span>
                      {rem.allowsPhysicalExit && (
                        <span className="text-xs text-emerald-700">Permite salida física</span>
                      )}
                      {rem.invoiceObligationRemains && (
                        <span className="text-xs text-amber-700">Pendiente facturar</span>
                      )}
                      {quoteFolio && quoteId && (
                        <Link href={`/app/cotizaciones/${quoteId}`} className="text-xs text-accent hover:underline">
                          COT {quoteFolio}
                        </Link>
                      )}
                    </span>
                    <Link href={`/app/finanzas/remisiones/${rem.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Abrir remisión
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {canEdit && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Editar</h2>
          <form action={updateClientAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="version" value={client.version} />
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Nombre</span>
              <input
                name="name"
                defaultValue={client.name}
                required
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">RFC (facturación)</span>
              <input
                name="taxIdentity"
                defaultValue={client.taxIdentity ?? ""}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm font-mono uppercase"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium">Domicilio fiscal / envío</span>
              <textarea
                name="shippingAddress"
                rows={2}
                defaultValue={client.shippingAddress ?? ""}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Crédito (días)</span>
              <input
                name="creditDays"
                type="number"
                min={0}
                defaultValue={client.creditDays}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input name="requiresInvoice" type="checkbox" defaultChecked={client.requiresInvoice} />
              Requiere factura
            </label>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white sm:w-fit">
              Guardar cambios
            </button>
          </form>

          <form action={cancelClientAction} className="mt-6 border-t border-border pt-4">
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="version" value={client.version} />
            <h3 className="text-sm font-semibold text-danger">Baja lógica</h3>
            <input
              name="reason"
              required
              minLength={3}
              placeholder="Motivo de baja"
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="mt-2 rounded-md border border-danger px-3 py-2 text-sm text-danger hover:bg-red-50"
            >
              Dar de baja cliente
            </button>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-sm font-semibold">Contactos</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {contacts.length === 0 && <li className="text-slate-500">Sin contactos registrados.</li>}
          {contacts.map((c) => (
            <li key={c.id} className="rounded-md border border-border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                {c.isPrimary ? (
                  <span className="text-xs font-medium text-accent">Principal</span>
                ) : canEdit ? (
                  <form action={setPrimaryClientContactAction}>
                    <input type="hidden" name="clientId" value={client.id} />
                    <input type="hidden" name="contactId" value={c.id} />
                    <button type="submit" className="text-xs text-accent hover:underline">
                      Marcar principal
                    </button>
                  </form>
                ) : null}
              </div>
              {c.roleTitle && <p className="text-xs text-slate-500">{c.roleTitle}</p>}
              <p className="text-slate-600">
                {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </p>
              {canEdit && (
                <form action={removeClientContactAction} className="mt-2">
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="contactId" value={c.id} />
                  <button type="submit" className="text-xs text-danger hover:underline">
                    Quitar contacto
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        {canEdit && (
          <form action={addClientContactAction} className="mt-4 space-y-2 border-t border-border pt-4">
            <input type="hidden" name="clientId" value={client.id} />
            <p className="text-xs font-medium uppercase text-slate-500">Agregar contacto</p>
            <input name="name" required placeholder="Nombre" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <input name="roleTitle" placeholder="Puesto / rol" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <input name="phone" placeholder="Teléfono" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <input name="email" type="email" placeholder="Correo" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input name="makePrimary" type="checkbox" />
              Marcar como principal
            </label>
            <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-slate-50">
              Agregar
            </button>
          </form>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold">Comunicaciones</h2>
        <p className="mt-1 text-xs text-slate-500">
          Elige uno o varios contactos; el contacto principal del cliente no cambia.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {communications.length === 0 && <li className="text-slate-500">Sin comunicaciones registradas.</li>}
          {communications.map((c) => (
            <li key={c.id} className="rounded-md border border-border px-3 py-2">
              <p className="text-xs text-slate-500">
                {new Date(c.createdAt).toLocaleString("es-MX")} · Destinatarios: {c.recipientNames.join(", ")}
              </p>
              {c.subject && <p className="font-medium">{c.subject}</p>}
              <p className="text-slate-700">{c.body}</p>
            </li>
          ))}
        </ul>
        {canEdit && contacts.length > 0 && (
          <form action={logClientCommunicationAction} className="mt-4 space-y-2 border-t border-border pt-4">
            <input type="hidden" name="clientId" value={client.id} />
            <p className="text-xs font-medium uppercase text-slate-500">Registrar comunicación</p>
            <fieldset className="space-y-1">
              {contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="contactIds" value={c.id} />
                  {c.name}
                  {c.isPrimary ? " (principal)" : ""}
                </label>
              ))}
            </fieldset>
            <input name="subject" placeholder="Asunto (opcional)" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <textarea name="body" required rows={3} placeholder="Mensaje o nota de envío" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="sendEmail" />
                Enviar por correo
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="sendWhatsapp" />
                Enviar por WhatsApp
              </label>
            </div>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
              Registrar y enviar
            </button>
          </form>
        )}
        {canEdit && contacts.length === 0 && (
          <p className="mt-2 text-xs text-amber-800">Agrega contactos antes de registrar una comunicación.</p>
        )}
      </Card>

      {history.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Historial</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="rounded-md border border-border px-3 py-2">
                <span className="font-medium">{h.eventType === "CANCELLED" ? "Baja" : "Actualización"}</span>
                <span className="text-slate-500"> · {h.actorName}</span>
                <span className="text-slate-500"> · {new Date(h.createdAt).toLocaleString("es-MX")}</span>
                {h.reason && <p className="text-slate-600">{h.reason}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
