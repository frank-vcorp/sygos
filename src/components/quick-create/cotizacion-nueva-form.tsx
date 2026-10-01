"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { quickCreateHref } from "@/lib/quick-create-return";

type ClientOption = { id: string; name: string; isIntercompany: boolean };

export function CotizacionNuevaForm({
  clients,
  canCreateClient,
  initialClientId,
  initialReference,
  createQuoteAction,
}: {
  clients: ClientOption[];
  canCreateClient: boolean;
  initialClientId?: string;
  initialReference?: string;
  createQuoteAction: (formData: FormData) => void;
}) {
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [commercialReference, setCommercialReference] = useState(initialReference ?? "");

  const createClientHref = useMemo(
    () =>
      quickCreateHref("/app/clientes/nuevo", "/app/cotizaciones/nueva", {
        commercialReference,
      }),
    [commercialReference],
  );

  const filtered = clients.filter((c) => !c.isIntercompany);

  return (
    <form action={createQuoteAction} className="space-y-4">
      <div className="space-y-1">
        <select
          name="clientId"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="">Cliente</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {canCreateClient && (
          <p className="text-xs text-slate-600">
            ¿No está en la lista?{" "}
            <Link href={createClientHref} className="font-semibold text-accent hover:underline">
              Crear cliente
            </Link>
          </p>
        )}
      </div>
      <input
        name="commercialReference"
        placeholder="Referencia comercial"
        value={commercialReference}
        onChange={(e) => setCommercialReference(e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button type="submit" className={buttonVariants({ variant: "primary" })}>
          Crear
        </button>
        <Link href="/app/cotizaciones" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
