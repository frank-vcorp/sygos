import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../activos/actions";
import { createInvoiceAction, listInvoices, registerPaymentAction } from "./actions";

export default async function FinanzasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["ADMINISTRADOR", "CEO", "COORDINACION_ADMIN"].includes(session.role)) redirect("/app");

  const invoices = await listInvoices(session.activeCompany.id);
  const clients = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Finanzas — {session.activeCompany.displayName}</h1>
      <p className="text-sm text-slate-600">Dashboard por empresa activa (sin consolidado).</p>
      <form action={createInvoiceAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
        <select name="clientId" required className="rounded border px-2 py-1 text-sm">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="totalMxn" type="number" required placeholder="Total MXN" className="rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Factura borrador</button>
      </form>
      <ul className="text-sm">
        {invoices.map((i) => (
          <li key={i.id} className="border-b py-2">
            {i.folio} — ${i.totalMxn} — {i.status}
            <form action={registerPaymentAction} className="mt-1 flex gap-1">
              <input type="hidden" name="invoiceId" value={i.id} />
              <input name="amountMxn" type="number" placeholder="Pago MXN" className="w-24 rounded border px-1" />
              <button type="submit" className="text-xs text-accent">Registrar pago</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
