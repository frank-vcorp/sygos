import { switchCompanyAction } from "@/app/app/actions";
import { canSwitchActiveCompany } from "@/lib/permissions-company";
import type { SessionUser } from "@/lib/session";
import { Building2 } from "lucide-react";

export function CompanySwitcher({ session }: { session: SessionUser }) {
  if (!canSwitchActiveCompany(session.role) || session.allowedCompanies.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-white p-1 shadow-sm">
      <span className="flex items-center gap-1 px-1.5 text-[11px] font-medium text-slate-500">
        <Building2 className="size-3.5" />
        Empresa
      </span>
      {session.allowedCompanies.map((company) => {
        const active = company.id === session.activeCompany.id;
        return (
          <form key={company.id} action={switchCompanyAction.bind(null, company.id)}>
            <button
              type="submit"
              disabled={active}
              className={`min-h-8 rounded-lg px-2.5 text-xs font-semibold ${
                active ? "bg-accent text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
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
