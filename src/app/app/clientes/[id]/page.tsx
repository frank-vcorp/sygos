import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient, getClientContacts } from "../../maestros/actions";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const client = await getClient(session.activeCompany.id, id);
  if (!client) notFound();

  const contacts = await getClientContacts(client.id);

  return (
    <div className="space-y-4">
      <Link href="/app/clientes" className="text-sm text-accent hover:underline">
        ← Clientes
      </Link>
      <h1 className="text-xl font-semibold">{client.name}</h1>
      <dl className="grid gap-3 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Crédito</dt>
          <dd>{client.creditDays} días</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Requiere factura</dt>
          <dd>{client.requiresInvoice ? "Sí" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Clasificación</dt>
          <dd>{client.classification ?? "NORMAL"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Intercompañía</dt>
          <dd>{client.isIntercompany ? "Sí" : "No"}</dd>
        </div>
      </dl>
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Contactos</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {contacts.length === 0 && <li className="text-slate-500">Sin contactos registrados.</li>}
          {contacts.map((c) => (
            <li key={c.id} className="rounded-md border border-border px-3 py-2">
              <span className="font-medium">{c.name}</span>
              {c.isPrimary && <span className="ml-2 text-xs text-accent">Principal</span>}
              <p className="text-slate-600">
                {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
