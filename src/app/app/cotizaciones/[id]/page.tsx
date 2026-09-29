import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canApplyQuoteDiscount, canSeeSupplierCost, canSetQuotePrice } from "@/lib/permissions-commercial";
import {
  applyQuoteDiscountAction,
  authorizeWithoutEquipmentAction,
  getQuote,
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
};

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const quote = await getQuote(session.activeCompany.id, id);
  if (!quote) notFound();
  const contacts = await listContactsForClient(quote.clientId);
  const showSupplierCost = canSeeSupplierCost(session);
  const hideCostFromVendedor = session.role === "VENTAS_SYSTRON";

  return (
    <div className="space-y-4">
      <Link href="/app/cotizaciones" className="text-sm text-accent">← Cotizaciones</Link>
      <h1 className="font-mono text-xl">{quote.folio}</h1>
      <p className="text-sm">
        Estado: {quote.status} {quote.pendingPricing && "· pendiente precio"}
      </p>
      {quote.pendingOrigin && (
        <p className="text-xs text-slate-600">Origen bandeja: {ORIGIN_LABEL[quote.pendingOrigin] ?? quote.pendingOrigin}</p>
      )}
      {!hideCostFromVendedor && quote.priceMxn != null && (
        <p className="text-sm">Precio base: ${quote.priceMxn} MXN</p>
      )}
      {showSupplierCost && quote.systronSupplierCostMxn != null && (
        <p className="text-sm text-slate-600">Costo base Servomotores (CEO): ${quote.systronSupplierCostMxn} MXN</p>
      )}
      {quote.finalPriceMxn != null && <p className="text-sm font-medium">Precio final: ${quote.finalPriceMxn} MXN</p>}

      {canSetQuotePrice(session.role) && quote.pendingPricing && (
        <form action={setQuotePriceAction} className="flex flex-wrap gap-2 rounded border bg-card p-4 text-sm">
          <input type="hidden" name="quoteId" value={quote.id} />
          <input name="priceMxn" type="number" required placeholder="Precio MXN" className="rounded border px-2 py-1" />
          {showSupplierCost && (
            <input name="systronSupplierCostMxn" type="number" placeholder="Costo SM (opcional)" className="rounded border px-2 py-1" />
          )}
          <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Fijar precio</button>
        </form>
      )}

      {canApplyQuoteDiscount(session.role) && quote.priceMxn != null && (
        <form action={applyQuoteDiscountAction} className="flex gap-2 text-sm">
          <input type="hidden" name="quoteId" value={quote.id} />
          <input name="discountPercent" type="number" min={0} max={100} placeholder="% descuento" className="w-24 rounded border px-2" />
          <button type="submit" className="rounded border px-2 py-1">Aplicar descuento</button>
        </form>
      )}

      {canSetQuotePrice(session.role) && (
        <form action={authorizeWithoutEquipmentAction}>
          <input type="hidden" name="quoteId" value={quote.id} />
          <button type="submit" className="text-xs text-accent underline">
            Autorizar sin equipo físico (pendiente ingreso)
          </button>
        </form>
      )}

      {contacts.length > 0 && quote.finalPriceMxn != null && (
        <form action={sendQuoteAction} className="space-y-2 rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Enviar — elegir contactos (no cambia el principal)</p>
          {contacts.map((c) => (
            <label key={c.id} className="flex gap-2 text-sm">
              <input type="checkbox" name="contactIds" value={c.id} />
              {c.name}{c.isPrimary ? " (principal)" : ""}
            </label>
          ))}
          <input type="hidden" name="quoteId" value={quote.id} />
          <button type="submit" className="rounded-md border px-3 py-1 text-sm">Registrar envío</button>
        </form>
      )}
    </div>
  );
}
