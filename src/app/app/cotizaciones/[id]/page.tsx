import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getQuote, listContactsForClient, sendQuoteAction } from "../actions";

export default async function CotizacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const quote = await getQuote(session.activeCompany.id, id);
  if (!quote) notFound();
  const contacts = await listContactsForClient(quote.clientId);

  return (
    <div className="space-y-4">
      <Link href="/app/cotizaciones" className="text-sm text-accent">← Cotizaciones</Link>
      <h1 className="font-mono text-xl">{quote.folio}</h1>
      <p className="text-sm">Estado: {quote.status} {quote.pendingPricing && "· pendiente precio"}</p>
      {contacts.length > 0 && (
        <form action={sendQuoteAction} className="rounded-xl border bg-card p-4 space-y-2">
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
