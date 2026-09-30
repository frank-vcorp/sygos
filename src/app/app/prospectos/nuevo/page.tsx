import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageProspects } from "@/lib/permissions";
import { createProspectAction } from "../../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";

export default async function NuevoProspectoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageProspects(session.role, session.activeCompany.code)) redirect("/app/prospectos");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Comercial"
        title="Nuevo prospecto"
        breadcrumbs={[{ label: "Prospectos", href: "/app/prospectos" }, { label: "Nuevo" }]}
      />
      <Card className="p-6">
        <form action={createProspectAction} className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Empresa / nombre</span>
            <input name="name" required className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Fuente</span>
            <input name="source" placeholder="Referido, feria, web…" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Nota</span>
            <input name="note" className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonVariants({ variant: "primary" })}>Guardar</button>
            <Link href="/app/prospectos" className={buttonVariants({ variant: "secondary" })}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
