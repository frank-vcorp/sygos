import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { canCreateEqui, createEquiAction, listClientsForSelect } from "../../activos/actions";

export default async function NuevoEquiPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canCreateEqui(session)) redirect("/app/equi");

  const clientOptions = await listClientsForSelect(session.activeCompany.id);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader eyebrow="Activos" title="Nuevo EQUI" breadcrumbs={[{ label: "Equipos", href: "/app/equi" }, { label: "Nuevo" }]} />
      <Card className="p-6">
      <form action={createEquiAction} className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Cliente</span>
          <select name="clientId" required className="mt-1 w-full rounded-md border border-border px-3 py-2">
            <option value="">Seleccionar…</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Modelo</span>
          <input name="model" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Marca</span>
          <input name="brand" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Tipo</span>
          <input name="equipmentType" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Serial fabricante (opcional)</span>
          <input name="manufacturerSerial" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Descripción</span>
          <textarea name="description" rows={2} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonVariants({ variant: "primary" })}>Crear EQUI</button>
          <Link href="/app/equi" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
        </div>
      </form>
      </Card>
    </div>
  );
}
