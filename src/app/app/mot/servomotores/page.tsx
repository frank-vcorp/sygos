import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canConfirmMotIngress, listMotByCustody, motDefinitiveEgressAction, motTrialExitAction } from "../../activos/actions";

export default async function MotServomotoresCustodiaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.activeCompany.code !== "SERVOMOTORES") redirect("/app/mot");
  if (!canConfirmMotIngress(session)) redirect("/app");

  const [ingresos, resguardo, egresos] = await Promise.all([
    listMotByCustody("PENDIENTE_INGRESO_SERVOMOTORES"),
    listMotByCustody("EN_RESGUARDO_SERVOMOTORES"),
    listMotByCustody("EGRESADO"),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/app/mot" className="text-sm text-accent hover:underline">← MOT</Link>
      <h1 className="text-xl font-semibold">Ingresos / Resguardo / Egresos</h1>
      <section>
        <h2 className="text-sm font-semibold">En resguardo</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {resguardo.map((m) => (
            <li key={m.id} className="rounded border border-border p-3">
              <Link href={`/app/mot/${m.id}`} className="font-mono text-accent">{m.folio}</Link>
              <div className="mt-2 flex flex-wrap gap-2">
                <form action={motTrialExitAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="version" value={m.version} />
                  <button type="submit" className="text-xs underline">Salida a prueba</button>
                </form>
                <form action={motDefinitiveEgressAction} className="flex gap-1">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="version" value={m.version} />
                  <input name="recipient" required placeholder="Recibe físicamente" className="rounded border px-1 text-xs" />
                  <button type="submit" className="text-xs underline">Egreso definitivo</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Pendientes de ingreso ({ingresos.length})</h2>
        <ul className="mt-2 text-sm">
          {ingresos.map((m) => (
            <li key={m.id}>
              <Link href={`/app/mot/${m.id}`} className="text-accent">{m.folio}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold">Egresados recientes</h2>
        <ul className="mt-2 text-sm text-slate-600">
          {egresos.slice(0, 10).map((m) => (
            <li key={m.id}>{m.folio}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
