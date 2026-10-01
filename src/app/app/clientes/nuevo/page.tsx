import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canManageClients } from "@/lib/permissions";
import { ClientContactsEditor } from "@/components/client-contacts-editor";
import { DuplicateWarning } from "@/components/quick-create/duplicate-warning";
import { createClientAction } from "../../maestros/actions";
import { PageHeader } from "@/components/patterns/page-header";
import { Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { clients } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { buildQuickCreateReturnUrl, sanitizeReturnTo } from "@/lib/quick-create-return";

function collectPreserve(searchParams: Record<string, string | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    if (k.startsWith("preserve_") && v) out[k.slice("preserve_".length)] = v;
  }
  return out;
}

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageClients(session.role, session.activeCompany.code)) redirect("/app/clientes");

  const sp = await searchParams;
  const returnTo = sp.returnTo ?? "";
  const safeReturn = sanitizeReturnTo(returnTo);
  const preserve = collectPreserve(sp);
  const duplicateIds =
    sp.duplicateWarning === "1" && sp.duplicateIds
      ? sp.duplicateIds.split(",").filter(Boolean)
      : [];

  const duplicateRows =
    duplicateIds.length > 0
      ? await getDb()
          .select({ id: clients.id, name: clients.name, folio: clients.folio })
          .from(clients)
          .where(
            and(
              eq(clients.companyId, session.activeCompany.id),
              inArray(clients.id, duplicateIds),
            ),
          )
      : [];

  const cancelHref = safeReturn ?? "/app/clientes";

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Comercial"
        title={safeReturn ? "Alta rápida de cliente" : "Nuevo cliente"}
        description={
          safeReturn
            ? "Captura lo mínimo; al guardar regresarás al proceso donde estabas."
            : undefined
        }
        breadcrumbs={[{ label: "Clientes", href: "/app/clientes" }, { label: "Nuevo" }]}
      />
      <Card className="space-y-4 p-6">
        {duplicateRows.length > 0 && (
          <DuplicateWarning
            title="Posibles clientes existentes"
            items={duplicateRows.map((d) => ({
              id: d.id,
              label: `${d.name}${d.folio ? ` · ${d.folio}` : ""}`,
            }))}
            selectHref={
              safeReturn
                ? (id) =>
                    buildQuickCreateReturnUrl(safeReturn, { key: "clientId", value: id }, preserve) ??
                    `/app/clientes/${id}`
                : undefined
            }
          />
        )}
        <form action={createClientAction} className="space-y-4">
          {safeReturn && <input type="hidden" name="returnTo" value={safeReturn} />}
          {Object.entries(preserve).map(([k, v]) => (
            <input key={k} type="hidden" name={`preserve_${k}`} value={v} />
          ))}
          {duplicateRows.length > 0 && <input type="hidden" name="confirmDuplicate" value="1" />}
          <label className="block text-sm">
            <span className="font-medium">Nombre / razón social</span>
            <input
              name="name"
              required
              defaultValue={sp.name ?? ""}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">RFC (facturación)</span>
            <input
              name="taxIdentity"
              defaultValue={sp.taxIdentity ?? ""}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono uppercase"
              placeholder="XAXX010101000"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Domicilio fiscal / envío</span>
            <textarea name="shippingAddress" rows={2} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Días de crédito</span>
            <input
              name="creditDays"
              type="number"
              min={0}
              defaultValue={0}
              className="mt-1 w-full rounded-md border border-border px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="requiresInvoice" type="checkbox" defaultChecked />
            Requiere factura
          </label>
          {!safeReturn && <ClientContactsEditor minRows={1} maxRows={8} />}
          <div className="flex gap-2">
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
