import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { switchCompanyAction } from "./actions";

function canSwitchCompany(role: string) {
  return role === "ADMINISTRADOR" || role === "CEO" || role === "COORDINACION_ADMIN";
}

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const showSwitcher = canSwitchCompany(session.role) && session.allowedCompanies.length > 1;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Base multiempresa (Bloque 1)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Sesión activa como <strong>{session.displayName}</strong> ({session.role.replaceAll("_", " ")}).
          Toda captura y consulta usará la empresa activa mostrada arriba.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-accent-muted px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Empresa activa</dt>
            <dd className="font-medium">{session.activeCompany.displayName}</dd>
          </div>
          <div className="rounded-md bg-accent-muted px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Código</dt>
            <dd className="font-mono text-sm">{session.activeCompany.code}</dd>
          </div>
        </dl>
      </section>

      {showSwitcher && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">Cambiar empresa activa</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {session.allowedCompanies.map((company) => {
              const active = company.id === session.activeCompany.id;
              return (
                <form key={company.id} action={switchCompanyAction.bind(null, company.id)}>
                  <button
                    type="submit"
                    disabled={active}
                    className={`rounded-md border px-3 py-2 text-sm font-medium ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-border bg-white hover:bg-slate-50"
                    }`}
                  >
                    {company.displayName}
                  </button>
                </form>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-border bg-white/60 p-6 text-sm text-slate-600">
        <p>
          Entrega 2 (Fase 1): usuarios demo, integraciones, folios en maestros, edición con control de versión, bajas
          con historial y cambio de contraseña en Mi cuenta.
        </p>
        <p className="mt-2">
          Usuarios de prueba (misma contraseña en <code className="text-xs">SYGOS_DEMO_USERS_PASSWORD</code>):{" "}
          <strong>ceo</strong>, <strong>coord</strong>, <strong>ger.systron</strong>, <strong>ger.servomotores</strong>,{" "}
          <strong>ventas.systron</strong>, <strong>almacen.systron</strong>.
        </p>
      </section>
    </div>
  );
}
