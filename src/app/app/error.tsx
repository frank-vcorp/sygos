"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-danger-muted text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-bold">No pudimos cargar esta vista</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          La operación no se completó. Puedes reintentar sin perder el contexto actual.
        </p>
        <Button className="mt-5" onClick={reset}>
          <RotateCcw className="size-4" />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
