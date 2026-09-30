import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import { createSupplierAction } from "../../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevoProveedorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSuppliers(session.role)) redirect("/app/proveedores");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Operación"
        title="Nuevo proveedor"
        breadcrumbs={[{ label: "Proveedores", href: "/app/proveedores" }, { label: "Nuevo" }]}
      />
      <Card className="space-y-4 p-6">
        <form action={createSupplierAction} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Nombre / razón social</span>
            <input name="name" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Contacto</span>
            <input name="contactName" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Teléfono</span>
            <input name="phone" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Correo</span>
            <input name="email" type="email" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Días de crédito</span>
            <input name="creditDays" type="number" min={0} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Guardar</button>
            <Link href="/app/proveedores" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
