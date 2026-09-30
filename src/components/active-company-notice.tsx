import type { SessionUser } from "@/lib/session";
import { Building2 } from "lucide-react";

export function ActiveCompanyNotice({ session }: { session: SessionUser }) {
  return (
    <div className="border-b border-accent/10 bg-accent-muted/55 px-4 py-2">
      <div className="mx-auto flex max-w-[1500px] items-center justify-center gap-2 text-xs text-slate-600">
        <Building2 className="size-3.5 text-accent" />
        <span>
          Trabajando en <strong className="text-accent">{session.activeCompany.displayName}</strong>
          <span className="hidden sm:inline"> · Todas las operaciones pertenecen a esta empresa</span>
        </span>
      </div>
    </div>
  );
}
