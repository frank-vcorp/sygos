import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import { getSession } from "@/lib/session";
import { canAccessPurchases } from "@/lib/permissions-purchases";
import { getPurchaseOrderDetail } from "../../actions";

export default async function OrdenCompraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessPurchases(session)) redirect("/app");

  const { id } = await params;
  const detail = await getPurchaseOrderDetail(session.activeCompany.id, id);
  if (!detail) notFound();
  const { po, linkedPurchases } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Abastecimiento"
        title={po.folio}
        description={po.description}
        breadcrumbs={[{ label: "Compras", href: "/app/compras" }, { label: po.folio }]}
        actions={<StatusBadge status={po.status} />}
      />

      <DetailGrid title="Orden de compra" description="Autorización y procesamiento hacia CxP o egreso.">
        <DetailItem label="Importe" value={formatMxnDisplay(po.amountMxn)} />
        <DetailItem
          label="Importe autorizado"
          value={po.authorizedAmountMxn != null ? formatMxnDisplay(po.authorizedAmountMxn) : "—"}
        />
        <DetailItem label="Estado" value={po.status.replaceAll("_", " ")} />
        <DetailItem label="Alta" value={new Date(po.createdAt).toLocaleString("es-MX")} />
        {po.cancelReason && (
          <DetailItem label="Motivo cancelación" value={po.cancelReason} className="sm:col-span-2 lg:col-span-3" />
        )}
      </DetailGrid>

      <SectionCard
        icon={ClipboardList}
        title="Movimientos vinculados"
        description="Compras generadas al procesar esta O.C."
        tone={linkedPurchases.length ? "default" : "muted"}
      >
        {linkedPurchases.length === 0 ? (
          <p className="text-sm text-slate-500">
            {po.status === "PROCESADA"
              ? "Sin movimiento registrado (revisar historial)."
              : "Al procesar la O.C. aparecerá el movimiento con CxP o egreso."}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border border-border">
            {linkedPurchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold">{p.description}</span>
                  <span className="text-slate-500"> · {formatMxnDisplay(p.amountMxn)}</span>
                  <StatusBadge status={p.status} className="ml-2" />
                </span>
                <Link href={`/app/compras/movimientos/${p.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Abrir movimiento
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Link href="/app/compras" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <ShoppingCart className="size-4" />
        Volver a compras
      </Link>
    </div>
  );
}
