import type { SessionUser } from "@/lib/session";

export function ActiveCompanyNotice({ session }: { session: SessionUser }) {
  return (
    <div className="border-b border-accent/20 bg-accent-muted/40 px-4 py-2 text-center text-xs text-slate-700">
      Contexto activo: <strong>{session.activeCompany.displayName}</strong> — los datos que captures y consultes
      pertenecen solo a esta empresa.
    </div>
  );
}
