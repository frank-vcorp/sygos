import { switchCompanyAction } from "@/app/app/actions";
import { canSwitchActiveCompany } from "@/lib/permissions-company";
import type { SessionUser } from "@/lib/session";

export function CompanySwitcher({ session }: { session: SessionUser }) {
  if (!canSwitchActiveCompany(session.role) || session.allowedCompanies.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-white px-2 py-1">
      <span className="text-xs text-slate-500">Empresa:</span>
      {session.allowedCompanies.map((company) => {
        const active = company.id === session.activeCompany.id;
        return (
          <form key={company.id} action={switchCompanyAction.bind(null, company.id)}>
            <button
              type="submit"
              disabled={active}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                active ? "bg-accent text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {company.displayName}
            </button>
          </form>
        );
      })}
    </div>
  );
}
