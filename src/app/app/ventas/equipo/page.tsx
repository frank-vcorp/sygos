import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { listClientsForSelect } from "../../activos/actions";
import { createSpecialCommercialQuoteAction } from "../../cotizaciones/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { CommercialQuoteCaptureForm } from "@/components/commercial/commercial-quote-capture-form";
import {
  listActiveContactsForCompany,
  listEquiOptionsForCommercial,
  listMotOptionsForCommercial,
} from "@/lib/quote-commercial-queries";

export default async function VentaEquipoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeCompany.code !== "SYSTRON" || session.role !== "VENTAS_SYSTRON") {
    if (!["CEO", "ADMINISTRADOR"].includes(session.role)) redirect("/app");
  }
  const companyId = session.activeCompany.id;
  const [clients, contacts, equiOptions, motOptions] = await Promise.all([
    listClientsForSelect(companyId),
    listActiveContactsForCompany(companyId),
    listEquiOptionsForCommercial(companyId),
    listMotOptionsForCommercial(session.activeCompany.code),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        eyebrow="Comercial"
        title="Venta de equipo"
        description="Misma captura comercial que una cotización iniciada por vendedor; tipo de oferta fijado en venta de equipo."
      />
      <Card className="p-6">
        <CommercialQuoteCaptureForm
          clients={clients}
          contacts={contacts}
          equiOptions={equiOptions}
          motOptions={motOptions}
          canCreateClient={canManageClients(session.role, session.activeCompany.code)}
          formAction={createSpecialCommercialQuoteAction}
          cancelHref="/app/cotizaciones"
          fixedOfferType="VENTA_EQUIPO"
          hiddenPendingOrigin="VENTA_EQUIPO"
          defaults={{ offerType: "VENTA_EQUIPO", equipmentMode: "preliminary" }}
        />
      </Card>
      <Link href="/app/cotizaciones" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Ver cotizaciones
      </Link>
    </div>
  );
}
