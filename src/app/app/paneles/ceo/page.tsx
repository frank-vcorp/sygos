import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function PanelCeoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "CEO" && session.role !== "ADMINISTRADOR") redirect("/app");

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <h1 className="text-xl font-semibold">Panel CEO</h1>
      <p className="text-sm text-slate-600">Empresa activa: {session.activeCompany.displayName}. Sin vista consolidada SYSTRON+Servomotores.</p>
      <ul className="list-disc pl-5 text-sm">
        <li>Operación y finanzas filtradas por empresa activa</li>
        <li>Búsqueda global disponible en barra superior</li>
      </ul>
    </div>
  );
}
