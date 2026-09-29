import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createPurchaseAction, listPurchases } from "./actions";

export default async function ComprasPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listPurchases(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Compras — {session.activeCompany.displayName}</h1>
      <form action={createPurchaseAction} className="flex flex-wrap gap-2 rounded border bg-card p-4">
        <input name="description" required placeholder="Descripción" className="rounded border px-2 py-1 text-sm" />
        <input name="amountMxn" type="number" required placeholder="MXN" className="rounded border px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">Registrar</button>
      </form>
      <p className="text-xs text-slate-500">&gt; $2,000 MXN requiere autorización CEO (O.C.).</p>
      <ul className="text-sm">
        {rows.map((p) => (
          <li key={p.id} className="border-b py-2">{p.description} — ${p.amountMxn} — {p.status}</li>
        ))}
      </ul>
    </div>
  );
}
