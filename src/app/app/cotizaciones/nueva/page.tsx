import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listClientsForSelect } from "../../activos/actions";
import { createQuoteAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevaCotizacionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const clients = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        eyebrow="Comercial"
        title="Nueva cotización"
        description="El vendedor puede iniciar sin precio; CEO/Admin fija precio después."
        breadcrumbs={[{ label: "Cotizaciones", href: "/app/cotizaciones" }, { label: "Nueva" }]}
      />
      <Card className="p-6">
        <form action={createQuoteAction} className="space-y-4">
          <select name="clientId" required className="w-full rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Cliente</option>
            {clients.filter((c) => !c.isIntercompany).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="commercialReference" placeholder="Referencia comercial" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Crear</button>
            <Link href="/app/cotizaciones" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
