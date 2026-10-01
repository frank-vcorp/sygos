import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banknote, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { DetailGrid, DetailItem } from "@/components/patterns/detail-grid";
import { buttonVariants } from "@/components/ui/button";
import { formatMxnDisplay } from "@/lib/format-currency";
import { canAccessPurchases } from "@/lib/permissions-purchases";
import { canGenerateFiscalDocuments } from "@/lib/permissions-finance";
import { getSession } from "@/lib/session";
import { getCashDisbursementDetail } from "../../actions";

export default async function EgresoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canGenerateFiscalDocuments(session) && !canAccessPurchases(session)) redirect("/app");

  const { id } = await params;
  const row = await getCashDisbursementDetail(session.activeCompany.id, id);
  if (!row) notFound();
  const { disbursement: eg, supplierName, purchase, pendingReceipt } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title={eg.folio}
        description={eg.description}
        breadcrumbs={[{ label: "Finanzas", href: "/app/finanzas" }, { label: "Egreso" }]}
      />

      <DetailGrid title="Egreso de caja" description="Origen operativo y comprobación cuando aplica.">
        <DetailItem label="Importe" value={formatMxnDisplay(eg.amountMxn)} />
        <DetailItem label="Registro" value={new Date(eg.createdAt).toLocaleString("es-MX")} />
        <DetailItem
          label="Proveedor"
          value={
            eg.supplierId && supplierName ? (
              <Link href={`/app/proveedores/${eg.supplierId}`} className="text-accent hover:underline">
                {supplierName}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <DetailItem
          label="Compra origen"
          value={
            purchase ? (
              <Link href={`/app/compras/movimientos/${purchase.id}`} className="text-accent hover:underline">
                {purchase.description}
              </Link>
            ) : (
              "Sin vínculo a compras"
            )
          }
        />
        {pendingReceipt && (
          <DetailItem
            label="Comprobación SM"
            value={
              <Link href="/app/finanzas/comprobaciones" className="text-accent hover:underline">
                Pendiente de factura ({pendingReceipt.status})
              </Link>
            }
          />
        )}
      </DetailGrid>

      <div className="flex flex-wrap gap-2">
        <Link href="/app/finanzas" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Banknote className="size-4" />
          Finanzas
        </Link>
        {purchase && (
          <Link href={`/app/compras/movimientos/${purchase.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ShoppingCart className="size-4" />
            Ver compra
          </Link>
        )}
      </div>
    </div>
  );
}
