import Link from "next/link";
import { loginAction } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <LoginForm errorPromise={searchParams} />
  );
}

async function LoginForm({ errorPromise }: { errorPromise: Promise<{ error?: string }> }) {
  const { error } = await errorPromise;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-600">Acceso operativo SYGOS 3.0</p>
        {error === "credenciales" && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">Credenciales inválidas</p>
        )}
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm outline-none ring-accent focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Entrar
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
