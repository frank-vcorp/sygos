import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listAttendances } from "./actions";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState, Card } from "@/components/ui/surface";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Plus, Wrench } from "lucide-react";

export default async function TecnicaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const rows = await listAttendances(session.activeCompany.id);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Operación técnica"
        description="Atenciones, diagnósticos y reparaciones con trazabilidad de principio a fin."
        actions={
          <Link href="/app/tecnica/nueva" className={buttonVariants({ variant: "primary" })}>
            <Plus className="size-4" />
            Nueva atención
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Wrench className="size-7" />} title="Sin atenciones activas" />
      ) : (
      <Card className="divide-y overflow-hidden">
        {rows.map((a) => (
          <Link key={a.id} href={`/app/tecnica/${a.id}`} className="group flex items-center gap-4 px-5 py-4 text-sm hover:bg-slate-50">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-muted text-accent">
              <Wrench className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">
                {a.attentionType.replaceAll("_", " ")}
              </span>
              <span className="mt-0.5 block truncate text-slate-500">{a.reportedFault ?? "Sin falla reportada"}</span>
            </span>
            <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
        ))}
      </Card>
      )}
    </div>
  );
}
