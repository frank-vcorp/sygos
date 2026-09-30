import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../../activos/actions";
import { createSpecialCommercialQuoteAction } from "../../cotizaciones/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function VentaEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeCompany.code !== "SYSTRON" || session.role !== "VENTAS_SYSTRON") {
    if (!["CEO", "ADMINISTRADOR"].includes(session.role)) redirect("/app");
  }
  const clients = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="max-w-xl">
      <PageHeader
        eyebrow="Comercial"
        title="Venta de equipo"
        description="Cotización comercial sin ingreso físico hasta autorización e ingreso de equipo."
      />
      <Card className="p-5">
        <form action={createSpecialCommercialQuoteAction} className="flex flex-col gap-3 text-sm sm:flex-row sm:items-end">
          <input type="hidden" name="origin" value="VENTA_EQUIPO" />
          <label className="flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-500">Cliente</span>
            <select name="clientId" required className="w-full rounded-md border border-border px-3 py-2">
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>Nueva cotización</button>
        </form>
        <Link href="/app/cotizaciones" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
          Ver cotizaciones
        </Link>
      </Card>
    </div>
  );
}
