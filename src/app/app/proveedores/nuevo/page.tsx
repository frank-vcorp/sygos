import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageSuppliers } from "@/lib/permissions";
import { DuplicateWarning } from "@/components/quick-create/duplicate-warning";
import { createSupplierAction } from "../../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { suppliers } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { buildQuickCreateReturnUrl, sanitizeReturnTo } from "@/lib/quick-create-return";

export default async function NuevoProveedorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSuppliers(session.role)) redirect("/app/proveedores");

  const sp = await searchParams;
  const safeReturn = sanitizeReturnTo(sp.returnTo ?? "");
  const duplicateIds =
    sp.duplicateWarning === "1" && sp.duplicateIds
      ? sp.duplicateIds.split(",").filter(Boolean)
      : [];

  const duplicateRows =
    duplicateIds.length > 0
      ? await getDb()
          .select({ id: suppliers.id, name: suppliers.name, folio: suppliers.folio })
          .from(suppliers)
          .where(
            and(
              eq(suppliers.companyId, session.activeCompany.id),
              inArray(suppliers.id, duplicateIds),
            ),
          )
      : [];

  const cancelHref = safeReturn ?? "/app/proveedores";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Operación"
        title={safeReturn ? "Alta rápida de proveedor" : "Nuevo proveedor"}
        description={safeReturn ? "Al guardar volverás al proceso de compras u operación." : undefined}
        breadcrumbs={[{ label: "Proveedores", href: "/app/proveedores" }, { label: "Nuevo" }]}
      />
      <Card className="space-y-4 p-6">
        {duplicateRows.length > 0 && (
          <DuplicateWarning
            title="Posibles proveedores existentes"
            items={duplicateRows.map((d) => ({
              id: d.id,
              label: `${d.name}${d.folio ? ` · ${d.folio}` : ""}`,
            }))}
            selectHref={
              safeReturn
                ? (id) =>
                    buildQuickCreateReturnUrl(safeReturn, { key: "supplierId", value: id }) ??
                    `/app/proveedores/${id}`
                : undefined
            }
          />
        )}
        <form action={createSupplierAction} className="grid gap-4 sm:grid-cols-2">
          {safeReturn && <input type="hidden" name="returnTo" value={safeReturn} className="sm:col-span-2" />}
          {duplicateRows.length > 0 && (
            <input type="hidden" name="confirmDuplicate" value="1" className="sm:col-span-2" />
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium">Nombre / razón social</span>
            <input
              name="name"
              required
              defaultValue={sp.name ?? ""}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
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
            <button type="submit" className={buttonVariants({ variant: "primary" })}>
              Guardar
            </button>
            <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
              Cancelar
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
