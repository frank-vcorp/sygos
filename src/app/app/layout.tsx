import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "../login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-sm font-semibold tracking-tight">
              SYGOS
            </Link>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
              {session.activeCompany.displayName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{session.displayName}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-accent underline-offset-2 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
