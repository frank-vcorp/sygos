import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invoices, purchases, quotes } from "@/db/schema";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { MetricCard } from "@/components/patterns/metric-card";
import { FileText, ShoppingCart, Target } from "lucide-react";

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
    <div>
      <PageHeader
        eyebrow="Análisis"
        title="Reportes"
        description={`Solo lectura para ${session.activeCompany.displayName}. Sin consolidado multiempresa.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Facturas" value={inv.length} icon={FileText} hint="Export CSV disponible" />
        <MetricCard label="Compras" value={pur.length} icon={ShoppingCart} />
        <MetricCard label="Cotizaciones" value={quo.length} icon={Target} />
      </div>
      <p className="mt-6">
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvInv)}`}
          download={`facturas-${session.activeCompany.code}.csv`}
          className="text-sm font-semibold text-accent hover:underline"
        >
          Descargar facturas (CSV)
        </a>
      </p>
    </div>
  );
}
