import Link from "next/link";
import { ArrowRight, CheckCircle2, Factory, ShieldCheck } from "lucide-react";
import { SygosLogo } from "@/components/brand/sygos-logo";
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
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden bg-[var(--sidebar)] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 size-96 rounded-full bg-[var(--brand-teal)]/12 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-[30rem] rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <SygosLogo size="hero" onDark priority />
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand-teal)]">Operación conectada</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-white">
            Claridad para decidir.<br />Control para crecer.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Gestión integral para SYSTRON y Servomotores, con trazabilidad, permisos y operación en tiempo real.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck className="size-5 text-blue-300" /> Acceso seguro por rol
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Factory className="size-5 text-blue-300" /> Operación multiempresa
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="size-5 text-blue-300" /> Procesos trazables
            </div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">SYGOS 3.0 · Plataforma empresarial</p>
      </section>

      <section className="flex items-center justify-center bg-[#f7f9fb] px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center lg:hidden">
          <SygosLogo size="lg" priority />
        </div>
        <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_16px_50px_rgba(15,23,42,.08)] sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Bienvenido</p>
        <h1 className="mt-2 text-2xl font-bold">Inicia sesión</h1>
        <p className="mt-2 text-sm text-slate-500">Accede a tu espacio de trabajo operativo.</p>
        {error === "credenciales" && (
          <p className="mt-4 rounded-xl bg-danger-muted px-4 py-3 text-sm font-medium text-danger">El usuario o la contraseña no son válidos.</p>
        )}
        <form action={loginAction} className="mt-7 space-y-5">
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              required
              placeholder="Vectoria"
              className="mt-2 h-12 w-full rounded-xl border border-border bg-slate-50 px-4 text-sm outline-none focus:border-[var(--ring)] focus:bg-white focus:ring-4 focus:ring-blue-100/70"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 h-12 w-full rounded-xl border border-border bg-slate-50 px-4 text-sm outline-none focus:border-[var(--ring)] focus:bg-white focus:ring-4 focus:ring-blue-100/70"
            />
          </label>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white shadow-lg shadow-blue-950/10 hover:bg-[#0b2d4e]"
          >
            Entrar al sistema <ArrowRight className="size-4" />
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Volver al inicio
          </Link>
        </p>
        </div>
      </div>
      </section>
    </main>
  );
}
