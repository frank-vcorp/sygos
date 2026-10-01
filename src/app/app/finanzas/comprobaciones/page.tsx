import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listSuppliers } from "../../maestros/actions";
import { listPendingReceipts, regularizePendingReceiptAction, registerPendingReceiptAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Pendientes de comprobación"
        description="Servomotores — pagos en efectivo pendientes de factura."
        breadcrumbs={[{ label: "Finanzas", href: "/app/finanzas" }, { label: "Comprobaciones" }]}
      />
      <Card className="p-5">
        <form action={registerPendingReceiptAction} className="flex flex-wrap gap-2 text-sm">
          <select name="supplierId" required className="rounded-md border border-border px-3 py-2">
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input name="amountMxn" type="number" required placeholder="MXN" className="rounded-md border border-border px-3 py-2" />
          <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Registrar pago + egreso</button>
        </form>
      </Card>
      <Card className="divide-y p-2 text-sm">
        {rows.map((r) => (
          <div key={r.id} className="px-3 py-3">
            ${r.amountMxn} —{" "}
            {r.cashDisbursementId ? (
              <Link href={`/app/finanzas/egresos/${r.cashDisbursementId}`} className="font-mono text-accent hover:underline">
                Ver egreso
              </Link>
            ) : (
              "sin egreso"
            )}
            <form action={regularizePendingReceiptAction} className="mt-2 flex gap-1">
              <input type="hidden" name="receiptId" value={r.id} />
              <input name="invoiceId" placeholder="ID factura (opcional)" className="rounded-md border border-border px-2 py-1 text-xs" />
              <button type="submit" className="text-xs font-semibold text-accent">Regularizar</button>
            </form>
          </div>
        ))}
        {rows.length === 0 && <p className="px-3 py-8 text-center text-slate-500">Sin pendientes.</p>}
      </Card>
    </div>
  );
}
