import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClientsForSelect } from "../../activos/actions";
import { createQuoteAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { CotizacionNuevaForm } from "@/components/quick-create/cotizacion-nueva-form";

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; commercialReference?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { clientId, commercialReference } = await searchParams;
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
        <CotizacionNuevaForm
          clients={clients}
          canCreateClient={canManageClients(session.role, session.activeCompany.code)}
          initialClientId={clientId}
          initialReference={commercialReference}
          createQuoteAction={createQuoteAction}
        />
      </Card>
    </div>
  );
}
