import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClientsForSelect } from "../../activos/actions";
import { createQuoteAction } from "../actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { CommercialQuoteCaptureForm } from "@/components/commercial/commercial-quote-capture-form";
import {
  listActiveContactsForCompany,
  listEquiOptionsForCommercial,
  listMotOptionsForCommercial,
} from "@/lib/quote-commercial-queries";

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; commercialReference?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { clientId, commercialReference } = await searchParams;
  const companyId = session.activeCompany.id;
  const [clients, contacts, equiOptions, motOptions] = await Promise.all([
    listClientsForSelect(companyId),
    listActiveContactsForCompany(companyId),
    listEquiOptionsForCommercial(companyId),
    listMotOptionsForCommercial(session.activeCompany.code),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Comercial"
        title="Nueva cotización"
        description="Captura el contexto comercial (§20.3): líneas, equipo o datos preliminares, contactos y referencia. El CEO fija el precio después."
        breadcrumbs={[{ label: "Cotizaciones", href: "/app/cotizaciones" }, { label: "Nueva" }]}
      />
      <Card className="p-6">
        <CommercialQuoteCaptureForm
          clients={clients}
          contacts={contacts}
          equiOptions={equiOptions}
          motOptions={motOptions}
          canCreateClient={canManageClients(session.role, session.activeCompany.code)}
          formAction={createQuoteAction}
          cancelHref="/app/cotizaciones"
          initialClientId={clientId}
          defaults={{ commercialReference }}
        />
      </Card>
    </div>
  );
}
