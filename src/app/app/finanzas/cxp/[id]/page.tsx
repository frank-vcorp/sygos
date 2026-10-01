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
import { getPayableDetail } from "../../actions";

export default async function CxpDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canGenerateFiscalDocuments(session) && !canAccessPurchases(session)) redirect("/app");

  const { id } = await params;
  const row = await getPayableDetail(session.activeCompany.id, id);
  if (!row) notFound();
  const { payable: ap, supplierName, purchase } = row;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finanzas"
        title={`CxP · ${supplierName}`}
        description={`Saldo abierto ${formatMxnDisplay(ap.openMxn)}`}
        breadcrumbs={[{ label: "Finanzas", href: "/app/finanzas" }, { label: "CxP" }]}
      />

      <DetailGrid title="Cuenta por pagar" description="Proveedor y compra que originó la obligación.">
        <DetailItem label="Saldo abierto" value={formatMxnDisplay(ap.openMxn)} />
        <DetailItem label="Alta" value={new Date(ap.createdAt).toLocaleString("es-MX")} />
        <DetailItem
          label="Proveedor"
          value={
            <Link href={`/app/proveedores/${ap.supplierId}`} className="text-accent hover:underline">
              {supplierName}
            </Link>
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
