import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { createClientAction } from "../../maestros/actions";

export default async function NuevoClientePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageClients(session.role, session.activeCompany.code)) redirect("/app/clientes");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Nuevo cliente</h1>
      <form action={createClientAction} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <label className="block text-sm">
          <span className="font-medium">Nombre / razón social</span>
          <input name="name" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Días de crédito</span>
          <input name="creditDays" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="requiresInvoice" type="checkbox" defaultChecked />
          Requiere factura
        </label>
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-medium">Contacto principal (opcional)</legend>
          <input name="contactName" placeholder="Nombre" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          <input name="contactPhone" placeholder="Teléfono" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          <input name="contactEmail" placeholder="Correo" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
        </fieldset>
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          Guardar
        </button>
      </form>
    </div>
  );
}
