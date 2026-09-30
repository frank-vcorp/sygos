import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PageHeader } from "@/components/patterns/page-header";
import { SectionCard } from "@/components/patterns/section-card";
import { buttonVariants } from "@/components/ui/button";
import { kioskPunchAction, listEmployees } from "../rrhh/actions";

export default async function KioscoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "KIOSCO_ASISTENCIA" && session.role !== "ADMINISTRADOR") redirect("/app");
  const employees = await listEmployees(session.activeCompany.id).then((list) =>
    list.filter((e) => e.kioskEligible && e.active),
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        eyebrow="Capital humano"
        title="Kiosco de asistencia"
        description={`Registro de entrada y salida · ${session.activeCompany.displayName}`}
      />
      {employees.length === 0 ? (
        <SectionCard title="Sin colaboradores en kiosco" description="Activa «Elegible para kiosco» en Capital humano.">
          <p className="text-sm text-slate-600">Solo aparecen colaboradores activos marcados para este dispositivo.</p>
        </SectionCard>
      ) : (
        employees.map((e) => (
          <SectionCard key={e.id} title={e.fullName} description={`# ${e.employeeNumber}`}>
            <div className="flex flex-wrap gap-2">
              <form action={kioskPunchAction}>
                <input type="hidden" name="employeeId" value={e.id} />
                <input type="hidden" name="direction" value="IN" />
                <button type="submit" className={buttonVariants({ variant: "primary" })}>Entrada</button>
              </form>
              <form action={kioskPunchAction}>
                <input type="hidden" name="employeeId" value={e.id} />
                <input type="hidden" name="direction" value="OUT" />
                <button type="submit" className={buttonVariants({ variant: "secondary" })}>Salida</button>
              </form>
            </div>
          </SectionCard>
        ))
      )}
    </div>
  );
}
