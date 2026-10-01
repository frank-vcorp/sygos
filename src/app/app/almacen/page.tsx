import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageSystronWarehouse } from "@/lib/permissions-activos";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, StatusBadge } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import {
  listEquiWarehouse,
  registerEquiEntryAction,
  registerEquiDefinitiveExitAction,
  registerEquiReturnFromTrialAction,
  registerEquiTrialExitAction,
} from "./actions";

const WH_LABEL: Record<string, string> = {
  SIN_ENTRADA: "Sin entrada",
  EN_RESGUARDO: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  SALIDA_DEFINITIVA: "Salida definitiva",
};

export default async function AlmacenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSystronWarehouse(session)) redirect("/app");

  const rows = await listEquiWarehouse(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Activos"
        title="Almacén SYSTRON"
        description="Entradas, resguardo y salidas de equipos EQUI. Los MOT de SYSTRON no pasan por aquí."
        actions={
          <Link href="/app/mot/servomotores" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Custodia MOT → SM
          </Link>
        }
      />
      <Card className="divide-y">
        {rows.map((e) => (
          <div key={e.id} className="space-y-2 px-5 py-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/app/equi/${e.id}`} className="font-mono font-semibold text-accent hover:underline">
                {e.folio}
              </Link>
              <StatusBadge status={e.warehouseStatus === "EN_RESGUARDO" ? "VALIDADA" : "PENDIENTE"} />
              <span className="text-slate-600">{WH_LABEL[e.warehouseStatus] ?? e.warehouseStatus}</span>
            </div>
            {e.warehouseStatus === "SIN_ENTRADA" && (
              <form action={registerEquiEntryAction} className="flex gap-2">
                <input type="hidden" name="equiId" value={e.id} />
                <input type="hidden" name="version" value={e.version} />
                <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                  Registrar entrada
                </button>
              </form>
            )}
            {e.warehouseStatus === "EN_RESGUARDO" && (
              <div className="flex flex-col gap-2">
                <form action={registerEquiTrialExitAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="equiId" value={e.id} />
                  <input type="hidden" name="version" value={e.version} />
                  <input name="reason" required placeholder="Motivo salida a prueba" className="rounded-md border border-border px-2 py-1 text-xs" />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Salida a prueba</button>
                </form>
                <form action={registerEquiDefinitiveExitAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="equiId" value={e.id} />
                  <input type="hidden" name="version" value={e.version} />
                  <input name="note" required placeholder="Destinatario y documento" className="rounded-md border border-border px-2 py-1 text-xs" />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Salida definitiva</button>
                </form>
              </div>
            )}
            {e.warehouseStatus === "SALIDA_PRUEBA" && (
              <div className="flex flex-wrap gap-2">
                <form action={registerEquiReturnFromTrialAction}>
                  <input type="hidden" name="equiId" value={e.id} />
                  <input type="hidden" name="version" value={e.version} />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Registrar retorno</button>
                </form>
                <form action={registerEquiDefinitiveExitAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="equiId" value={e.id} />
                  <input type="hidden" name="version" value={e.version} />
                  <input type="hidden" name="fromTrial" value="1" />
                  <input name="note" required placeholder="Destinatario y documento" className="rounded-md border border-border px-2 py-1 text-xs" />
                  <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Permanencia fuera</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <p className="px-5 py-10 text-center text-slate-500">Sin equipos en almacén.</p>}
      </Card>
    </div>
  );
}
