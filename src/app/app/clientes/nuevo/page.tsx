import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { ClientContactsEditor } from "@/components/client-contacts-editor";
import { createClientAction } from "../../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevoClientePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageClients(session.role, session.activeCompany.code)) redirect("/app/clientes");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Comercial"
        title="Nuevo cliente"
        breadcrumbs={[{ label: "Clientes", href: "/app/clientes" }, { label: "Nuevo" }]}
      />
      <Card className="p-6">
      <form action={createClientAction} className="space-y-4">
        <label className="block text-sm">
          <span className="font-medium">Nombre / razón social</span>
          <input name="name" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">RFC (facturación)</span>
          <input name="taxIdentity" className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono uppercase" placeholder="XAXX010101000" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Domicilio fiscal / envío</span>
          <textarea name="shippingAddress" rows={2} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Días de crédito</span>
          <input name="creditDays" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="requiresInvoice" type="checkbox" defaultChecked />
          Requiere factura
        </label>
        <ClientContactsEditor minRows={1} maxRows={8} />
        <div className="flex gap-2">
          <button type="submit" className={buttonVariants({ variant: "primary" })}>Guardar</button>
          <Link href="/app/clientes" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
        </div>
      </form>
      </Card>
    </div>
  );
}
