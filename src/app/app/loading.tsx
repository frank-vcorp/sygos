export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-label="Cargando contenido">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-8 w-72 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 rounded-2xl border border-border bg-white p-5">
            <div className="size-10 rounded-xl bg-slate-100" />
            <div className="mt-5 h-7 w-16 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border bg-white" />
    </div>
  );
}
