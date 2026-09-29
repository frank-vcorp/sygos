import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  listEquiWarehouse,
  registerEquiEntryAction,
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
  if (session.activeCompany.code !== "SYSTRON") redirect("/app");

  const rows = await listEquiWarehouse(session.activeCompany.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Almacén SYSTRON</h1>
      <p className="text-sm text-slate-600">Entradas, resguardo y salidas (EQUI). Los MOT de SYSTRON no pasan por aquí.</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((e) => (
          <li key={e.id} className="space-y-2 px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/app/equi/${e.id}`} className="font-mono text-accent hover:underline">
                {e.folio}
              </Link>
              <span>{WH_LABEL[e.warehouseStatus] ?? e.warehouseStatus}</span>
            </div>
            {e.warehouseStatus === "SIN_ENTRADA" && (
              <form action={registerEquiEntryAction} className="flex gap-2">
                <input type="hidden" name="equiId" value={e.id} />
                <input type="hidden" name="version" value={e.version} />
                <button type="submit" className="rounded-md bg-accent px-2 py-1 text-xs text-white">
                  Registrar entrada
                </button>
              </form>
            )}
            {e.warehouseStatus === "EN_RESGUARDO" && (
              <form action={registerEquiTrialExitAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="equiId" value={e.id} />
                <input type="hidden" name="version" value={e.version} />
                <input name="reason" required placeholder="Motivo salida a prueba" className="rounded border px-2 py-1 text-xs" />
                <button type="submit" className="rounded-md border px-2 py-1 text-xs">Salida a prueba</button>
              </form>
            )}
            {e.warehouseStatus === "SALIDA_PRUEBA" && (
              <form action={registerEquiReturnFromTrialAction}>
                <input type="hidden" name="equiId" value={e.id} />
                <input type="hidden" name="version" value={e.version} />
                <button type="submit" className="rounded-md border px-2 py-1 text-xs">Registrar retorno</button>
              </form>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-8 text-center text-slate-500">Sin EQUI.</li>}
      </ul>
      <Link href="/app/mot/servomotores" className="text-sm text-accent hover:underline">
        Custodia MOT → Servomotores
      </Link>
    </div>
  );
}
