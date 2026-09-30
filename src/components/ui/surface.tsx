import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,.03),0_8px_28px_rgba(15,23,42,.035)]",
        className,
      )}
      {...props}
    />
  );
}

const statusStyles: Record<string, string> = {
  AUTORIZADA: "bg-success-muted text-success",
  VALIDADO: "bg-success-muted text-success",
  VALIDADA: "bg-success-muted text-success",
  PROCESADA: "bg-success-muted text-success",
  COMPLETADA: "bg-success-muted text-success",
  BORRADOR: "bg-slate-100 text-slate-600",
  PENDIENTE_PRECIO: "bg-warning-muted text-warning",
  ENVIADA: "bg-sky-100 text-sky-800",
  TIMBRADA: "bg-success-muted text-success",
  INTERCOMPAÑÍA: "bg-violet-100 text-violet-800",
  SIN_ENTRADA: "bg-slate-100 text-slate-600",
  EN_RESGUARDO: "bg-sky-100 text-sky-800",
  EN_RESGUARDO_SERVOMOTORES: "bg-sky-100 text-sky-800",
  PENDIENTE_INGRESO_SERVOMOTORES: "bg-warning-muted text-warning",
  SALIDA_PRUEBA: "bg-amber-100 text-amber-900",
  SALIDA_DEFINITIVA: "bg-slate-200 text-slate-700",
  EGRESADO: "bg-slate-200 text-slate-600",
  PROCEDENTE: "bg-success-muted text-success",
  NO_PROCEDENTE: "bg-danger-muted text-danger",
  PENDIENTE: "bg-warning-muted text-warning",
  PENDIENTE_AUTORIZACION: "bg-warning-muted text-warning",
  PENDIENTE_VALIDACION: "bg-warning-muted text-warning",
  CANCELADA: "bg-danger-muted text-danger",
  RECHAZADA: "bg-danger-muted text-danger",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide",
        statusStyles[status] ?? "bg-accent-muted text-accent",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}
