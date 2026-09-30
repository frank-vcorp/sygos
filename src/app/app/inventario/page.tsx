import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getCompanySettings } from "@/lib/company-settings";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, EmptyState } from "@/components/ui/surface";
import { DataTable } from "@/components/patterns/data-table";
import { buttonVariants } from "@/components/ui/button";
import { Package } from "lucide-react";
import { adjustStockAction, createPartAction, listInventoryParts } from "./actions";

export default async function InventarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const settings = await getCompanySettings(session.activeCompany.id);
  if (session.activeCompany.code === "SERVOMOTORES" && !settings.servomotoresInventoryEnabled) {
    return (
      <div>
        <PageHeader eyebrow="Operación" title="Inventario Servomotores" description="Módulo deshabilitado para esta empresa." />
        <Card className="p-6 text-sm text-slate-600">
          Un Administrador puede habilitarlo en Configuración.
        </Card>
      </div>
    );
  }

  const parts = await listInventoryParts(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title={`Inventario — ${session.activeCompany.displayName}`}
        description="Existencias informativas; sin reservas ni compras automáticas."
      />
      <Card className="mb-6 p-5">
        <h2 className="text-sm font-semibold">Alta de refacción</h2>
        <form action={createPartAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="partNumber" required placeholder="Número de parte" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="description" required placeholder="Descripción" className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2" />
          <input name="minQuantity" type="number" placeholder="Mín (opcional)" className="rounded-md border border-border px-3 py-2 text-sm" />
          <input name="maxQuantity" type="number" placeholder="Máx (opcional)" className="rounded-md border border-border px-3 py-2 text-sm" />
          <button type="submit" className={`${buttonVariants({ variant: "primary", size: "sm" })} sm:col-span-2 sm:w-fit`}>
            Guardar refacción
          </button>
        </form>
      </Card>
      {parts.length === 0 ? (
        <EmptyState icon={<Package className="size-7" />} title="Sin refacciones" description="Registra la primera pieza en el formulario superior." />
      ) : (
        <DataTable title="Existencias" description={`${parts.length} partes registradas`}>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Parte</th>
                <th className="px-4 py-3">Existencia</th>
                <th className="px-4 py-3">Mín / Máx</th>
                <th className="px-4 py-3">Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{p.partNumber}</span>
                    <p className="text-slate-600">{p.description}</p>
                  </td>
                  <td className="px-4 py-3">{p.quantityOnHand}</td>
                  <td className="px-4 py-3">{p.minQuantity ?? "—"} / {p.maxQuantity ?? "—"}</td>
                  <td className="px-4 py-3">
                    <form action={adjustStockAction} className="flex gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="delta" type="number" placeholder="+/-" className="w-16 rounded-md border border-border px-2 py-1 text-xs" />
                      <button type="submit" className="text-xs font-semibold text-accent">Aplicar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}
