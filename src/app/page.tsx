import Link from "next/link";
import { SygosLogo } from "@/components/brand/sygos-logo";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6">
      <SygosLogo size="hero" />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          ERP SYSTRON / Servomotores
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Operación multiempresa con contexto activo separado y trazabilidad en tiempo real.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex w-fit items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/10 hover:bg-[var(--accent-hover)]"
      >
        Iniciar sesión
      </Link>
    </main>
  );
}
