import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-accent">SYGOS 3.0</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">ERP SYSTRON / Servomotores</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Operación multiempresa con contexto activo separado. Bloque 1 en construcción.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex w-fit items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
