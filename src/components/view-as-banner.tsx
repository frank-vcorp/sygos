import { clearViewAsAction } from "@/app/app/view-as/actions";
import type { SessionUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions-users";

export function ViewAsBanner({ session }: { session: SessionUser }) {
  if (!session.impersonator) return null;

  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replaceAll("_", " ");

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2">
        <p>
          <span className="font-semibold">Modo revisión:</span> estás viendo como{" "}
          <span className="font-semibold">{session.displayName}</span> ({roleLabel}). Las acciones se
          registran con este usuario.
        </p>
        <form action={clearViewAsAction}>
          <button
            type="submit"
            className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950"
          >
            Volver a {session.impersonator.displayName}
          </button>
        </form>
      </div>
    </div>
  );
}
