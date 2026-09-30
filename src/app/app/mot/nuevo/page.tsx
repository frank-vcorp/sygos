import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/form-fields";
import { getSession } from "@/lib/session";
import {
  canCreateMot,
  createMotServomotoresAction,
  createMotSystronAction,
  listClientsForSelect,
} from "../../activos/actions";

export default async function NuevoMotPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreateMot(session)) redirect("/app/mot");

  const clientOptions = await listClientsForSelect(session.activeCompany.id).then((rows) =>
    rows.filter((c) => !c.isIntercompany),
  );

  const isSystron = session.activeCompany.code === "SYSTRON";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Activos"
        title="Nuevo MOT"
        description={
          isSystron
            ? "MOT originado en SYSTRON: la operación técnica corre en Servomotores."
            : "MOT directo Servomotores — cliente de esta empresa."
        }
        breadcrumbs={[{ label: "Motores", href: "/app/mot" }, { label: "Nuevo" }]}
      />
      <SectionCard title="Identidad del motor" description="Se asigna folio MOT global al guardar." tone="accent">
        <form action={isSystron ? createMotSystronAction : createMotServomotoresAction} className="grid gap-4">
          <Field label={isSystron ? "Cliente final (SYSTRON)" : "Cliente"}>
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
          <Field label="Serial fabricante" hint="Referencia de placa; el folio MOT es la identidad en Sygos">
            <Input name="manufacturerSerial" />
          </Field>
          <Field label="Descripción / falla reportada">
            <Textarea name="description" rows={3} />
          </Field>
          <FormActions>
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Crear MOT</button>
            <Link href="/app/mot" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </FormActions>
        </form>
      </SectionCard>
    </div>
  );
}
