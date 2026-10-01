import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/surface";
import { formatMxnDisplay } from "@/lib/format-currency";
import { getSession } from "@/lib/session";
import { canAccessPurchases } from "@/lib/permissions-purchases";
import { getPurchaseDetail } from "../../actions";

export default async function CompraMovimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessPurchases(session)) redirect("/app");

  const { id } = await params;
  const row = await getPurchaseDetail(session.activeCompany.id, id);
  if (!row) notFound();
  const { purchase: p, supplierName, poFolio, disbursementFolio } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Abastecimiento"
        title={p.description}
        description={`Periodo ${p.calendarMonth}`}
        breadcrumbs={[{ label: "Compras", href: "/app/compras" }, { label: "Movimiento" }]}
        actions={<StatusBadge status={p.status} />}
      />

      <DetailGrid title="Compra" description="Relaciones hacia proveedor, O.C. y finanzas.">
        <DetailItem label="Importe" value={formatMxnDisplay(p.amountMxn)} />
        <DetailItem label="Estado" value={p.status} />
        <DetailItem label="Mes contable" value={p.calendarMonth} />
        <DetailItem label="Requiere CEO" value={p.requiresCeoAuth ? "Sí" : "No"} />
        <DetailItem
          label="Proveedor"
          value={
            p.supplierId && supplierName ? (
              <Link href={`/app/proveedores/${p.supplierId}`} className="text-accent hover:underline">
                {supplierName}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <DetailItem
          label="Orden de compra"
          value={
            p.purchaseOrderId && poFolio ? (
              <Link href={`/app/compras/ordenes/${p.purchaseOrderId}`} className="font-mono text-accent hover:underline">
                {poFolio}
              </Link>
            ) : (
              "Compra directa"
            )
          }
        />
        <DetailItem
          label="Egreso"
          value={
            disbursementFolio ? (
              <Link href="/app/finanzas/comprobaciones" className="font-mono text-accent hover:underline">
                {disbursementFolio}
              </Link>
            ) : p.payableBalanceId ? (
              <Link href="/app/finanzas" className="text-accent hover:underline">
                CxP registrada
              </Link>
            ) : (
              "Pendiente de liquidación"
            )
          }
        />
        <DetailItem label="Registro" value={new Date(p.createdAt).toLocaleString("es-MX")} />
      </DetailGrid>

      <Link href="/app/compras" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <ShoppingCart className="size-4" />
        Volver a compras
      </Link>
    </div>
  );
}
