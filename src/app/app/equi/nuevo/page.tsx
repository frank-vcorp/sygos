import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/form-fields";
import { getSession } from "@/lib/session";
import { canCreateEqui, createEquiAction, listClientsForSelect } from "../../activos/actions";

export default async function NuevoEquiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreateEqui(session)) redirect("/app/equi");

  const clientOptions = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Activos"
        title="Nuevo EQUI"
        description="Asigna folio permanente y vincula al cliente antes del ingreso a almacén."
        breadcrumbs={[{ label: "Equipos", href: "/app/equi" }, { label: "Nuevo" }]}
      />
      <SectionCard title="Datos del equipo" description="Solo SYSTRON registra equipos EQUI." tone="accent">
        <form action={createEquiAction} className="grid gap-4">
          <Field label="Cliente" hint="Propietario comercial del equipo">
            <Select name="clientId" required>
              <option value="">Seleccionar…</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modelo">
              <Input name="model" required />
            </Field>
            <Field label="Marca">
              <Input name="brand" />
            </Field>
          </div>
          <Field label="Tipo de equipo">
            <Input name="equipmentType" placeholder="Ej. Variador, PLC…" />
          </Field>
          <Field label="Serial fabricante" hint="Opcional; no reemplaza al folio EQUI">
            <Input name="manufacturerSerial" />
          </Field>
          <Field label="Descripción">
            <Textarea name="description" rows={3} />
          </Field>
          <FormActions>
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Crear EQUI</button>
            <Link href="/app/equi" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </FormActions>
        </form>
      </SectionCard>
    </div>
  );
}
