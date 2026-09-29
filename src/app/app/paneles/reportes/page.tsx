import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invoices, purchases, quotes } from "@/db/schema";
import { getSession } from "@/lib/session";

export default async function ReportesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["CEO", "ADMINISTRADOR", "COORDINACION_ADMIN", "GERENTE_OPERATIVO_SYSTRON", "GERENTE_OPERATIVO_SERVOMOTORES"].includes(session.role)) {
    redirect("/app");
  }
  const db = getDb();
  const companyId = session.activeCompany.id;
  const [inv, pur, quo] = await Promise.all([
    db.select().from(invoices).where(eq(invoices.companyId, companyId)).limit(500),
    db.select().from(purchases).where(eq(purchases.companyId, companyId)).limit(500),
    db.select().from(quotes).where(eq(quotes.companyId, companyId)).limit(500),
  ]);

  const csvInv = ["folio,total,status", ...inv.map((i) => `${i.folio},${i.totalMxn},${i.status}`)].join("\n");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reportes — {session.activeCompany.displayName}</h1>
      <p className="text-sm text-slate-600">Solo lectura; filtros por empresa activa. Sin consolidado multiempresa.</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded border p-3">
          <dt className="text-slate-500">Facturas</dt>
          <dd className="text-lg font-semibold">{inv.length}</dd>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvInv)}`}
            download={`facturas-${session.activeCompany.code}.csv`}
            className="text-accent text-xs"
          >
            Exportar CSV
          </a>
        </div>
        <div className="rounded border p-3">
          <dt className="text-slate-500">Compras</dt>
          <dd className="text-lg font-semibold">{pur.length}</dd>
        </div>
        <div className="rounded border p-3">
          <dt className="text-slate-500">Cotizaciones</dt>
          <dd className="text-lg font-semibold">{quo.length}</dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500">Los KPI enlazan a módulos de origen (finanzas, compras, cotizaciones).</p>
    </div>
  );
}
