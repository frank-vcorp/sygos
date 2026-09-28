import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { changePasswordAction } from "./actions";

const errors: Record<string, string> = {
  current: "La contraseña actual no coincide.",
  mismatch: "La confirmación no coincide con la nueva contraseña.",
  short: "La nueva contraseña debe tener al menos 10 caracteres.",
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { error, ok } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <Link href="/app" className="text-sm text-accent hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 text-sm text-slate-600">
          {session.displayName} · {session.username} · {session.role.replaceAll("_", " ")}
        </p>
      </div>

      {ok === "1" && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Contraseña actualizada.</p>
      )}
      {error && errors[error] && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{errors[error]}</p>
      )}

      <form action={changePasswordAction} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Cambiar contraseña</h2>
        <label className="block text-sm">
          <span className="font-medium">Contraseña actual</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Nueva contraseña</span>
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Confirmar nueva contraseña</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          Guardar contraseña
        </button>
      </form>
    </div>
  );
}
