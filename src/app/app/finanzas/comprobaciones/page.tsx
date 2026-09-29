import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listSuppliers } from "../../maestros/actions";
import { listPendingReceipts, regularizePendingReceiptAction, registerPendingReceiptAction } from "../actions";

export default async function ComprobacionesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeCompany.code !== "SERVOMOTORES") redirect("/app/finanzas");
  if (!["COORDINACION_ADMIN", "CEO", "ADMINISTRADOR", "GERENTE_OPERATIVO_SERVOMOTORES"].includes(session.role)) {
    redirect("/app");
  }
  const [rows, suppliers] = await Promise.all([
    listPendingReceipts(session.activeCompany.id),
    listSuppliers(session.activeCompany.id),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/app/finanzas" className="text-sm text-accent">← Finanzas</Link>
      <h1 className="text-xl font-semibold">Pendientes de comprobación — Servomotores</h1>
      <form action={registerPendingReceiptAction} className="flex flex-wrap gap-2 rounded border p-4 text-sm">
        <select name="supplierId" required className="rounded border px-2 py-1">
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input name="amountMxn" type="number" required placeholder="MXN" className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-accent px-3 py-1 text-white">Registrar pago + egreso</button>
      </form>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={r.id} className="border-b py-2">
            ${r.amountMxn} — egreso {r.cashDisbursementId?.slice(0, 8)}…
            <form action={regularizePendingReceiptAction} className="mt-1 flex gap-1">
              <input type="hidden" name="receiptId" value={r.id} />
              <input name="invoiceId" placeholder="ID factura al regularizar" className="rounded border text-xs" />
              <button type="submit" className="text-xs text-accent">Regularizar sin duplicar egreso</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
