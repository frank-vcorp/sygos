import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { EquiNuevoForm } from "@/components/quick-create/equi-nuevo-form";
import { canManageClients } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { canCreateEqui, createEquiAction, listClientsForSelect } from "../../activos/actions";

export default async function NuevoEquiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreateEqui(session)) redirect("/app/equi");

  const sp = await searchParams;
  const clientOptions = await listClientsForSelect(session.activeCompany.id);
  const preselectedClientId = sp.clientId;
  const preselectValid =
    preselectedClientId && clientOptions.some((c) => c.id === preselectedClientId)
      ? preselectedClientId
      : undefined;
  const preselectedName = preselectValid
    ? clientOptions.find((c) => c.id === preselectValid)?.name
    : undefined;

  const preserveDefaults = {
    model: sp.model ?? "",
    brand: sp.brand ?? "",
    equipmentType: sp.equipmentType ?? "",
    manufacturerSerial: sp.manufacturerSerial ?? "",
    description: sp.description ?? "",
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Activos"
        title="Nuevo EQUI"
        description="Asigna folio permanente y vincula al cliente antes del ingreso a almacén."
        breadcrumbs={
          preselectValid
            ? [
                { label: "Clientes", href: "/app/clientes" },
                { label: preselectedName ?? "Cliente", href: `/app/clientes/${preselectValid}` },
                { label: "Nuevo EQUI" },
              ]
            : [{ label: "Equipos", href: "/app/equi" }, { label: "Nuevo" }]
        }
      />
      <SectionCard title="Datos del equipo" description="Solo SYSTRON registra equipos EQUI." tone="accent">
        <EquiNuevoForm
          clientOptions={clientOptions}
          canCreateClient={canManageClients(session.role, session.activeCompany.code)}
          initialClientId={preselectValid}
          createEquiAction={createEquiAction}
          model={preserveDefaults.model}
          brand={preserveDefaults.brand}
          equipmentType={preserveDefaults.equipmentType}
          manufacturerSerial={preserveDefaults.manufacturerSerial}
          description={preserveDefaults.description}
        />
      </SectionCard>
    </div>
  );
}
