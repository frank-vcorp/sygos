"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { quickCreateHref } from "@/lib/quick-create-return";
import { QUOTE_LINE_KIND_LABEL, QUOTE_OFFER_TYPE_LABEL } from "@/lib/quote-commercial-labels";

type ClientOption = { id: string; name: string; isIntercompany: boolean };
type ContactOption = { id: string; clientId: string; name: string; email: string | null; phone: string | null };
type EquiOption = { id: string; clientId: string; folio: string; label: string };
type MotOption = { id: string; clientId: string | null; folio: string; label: string };

type LineDraft = { kind: "SERVICIO" | "PRODUCTO"; description: string; quantity: number };

export type CommercialQuoteCaptureDefaults = {
  offerType?: keyof typeof QUOTE_OFFER_TYPE_LABEL;
  commercialReference?: string;
  commercialNotes?: string;
  equipmentMode?: "none" | "equi" | "mot" | "preliminary";
  equiId?: string;
  motId?: string;
  preliminaryBrand?: string;
  preliminaryModel?: string;
  preliminarySerial?: string;
  preliminaryNotes?: string;
  lines?: LineDraft[];
  intendedContactIds?: string[];
};

export function CommercialQuoteCaptureForm({
  clients,
  contacts,
  equiOptions,
  motOptions,
  canCreateClient,
  formAction,
  cancelHref,
  initialClientId,
  lockClientId,
  quoteId,
  fixedOfferType,
  hiddenPendingOrigin,
  defaults,
  submitLabel = "Crear cotización",
}: {
  clients: ClientOption[];
  contacts: ContactOption[];
  equiOptions: EquiOption[];
  motOptions: MotOption[];
  canCreateClient: boolean;
  formAction: (formData: FormData) => void;
  cancelHref: string;
  initialClientId?: string;
  /** En edición: cliente fijo (no cambiable). */
  lockClientId?: string;
  quoteId?: string;
  fixedOfferType?: keyof typeof QUOTE_OFFER_TYPE_LABEL;
  hiddenPendingOrigin?: string;
  defaults?: CommercialQuoteCaptureDefaults;
  submitLabel?: string;
}) {
  const [clientId, setClientId] = useState(lockClientId ?? initialClientId ?? "");
  const [commercialReference, setCommercialReference] = useState(defaults?.commercialReference ?? "");
  const [commercialNotes, setCommercialNotes] = useState(defaults?.commercialNotes ?? "");
  const [equipmentMode, setEquipmentMode] = useState<"none" | "equi" | "mot" | "preliminary">(
    defaults?.equipmentMode ?? "none",
  );
  const [lines, setLines] = useState<LineDraft[]>(
    defaults?.lines?.length
      ? defaults.lines
      : [{ kind: "SERVICIO", description: "", quantity: 1 }],
  );

  const filteredClients = clients.filter((c) => !c.isIntercompany);
  const activeClientId = clientId;

  const clientContacts = useMemo(
    () => contacts.filter((c) => c.clientId === activeClientId),
    [contacts, activeClientId],
  );
  const clientEqui = useMemo(
    () => equiOptions.filter((e) => e.clientId === activeClientId),
    [equiOptions, activeClientId],
  );
  const clientMot = useMemo(
    () => motOptions.filter((m) => !m.clientId || m.clientId === activeClientId),
    [motOptions, activeClientId],
  );

  const createClientHref = useMemo(
    () =>
      quickCreateHref("/app/clientes/nuevo", cancelHref === "/app/cotizaciones" ? "/app/cotizaciones/nueva" : cancelHref, {
        commercialReference,
      }),
    [commercialReference, cancelHref],
  );

  function addLine() {
    setLines((prev) => [...prev, { kind: "SERVICIO", description: "", quantity: 1 }]);
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form action={formAction} className="space-y-6">
      {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}
      {hiddenPendingOrigin && <input type="hidden" name="pendingOrigin" value={hiddenPendingOrigin} />}
      {lockClientId ? (
        <input type="hidden" name="clientId" value={lockClientId} />
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Cliente</label>
          <select
            name="clientId"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">Selecciona cliente</option>
            {filteredClients.map((c) => (
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
      )}

      {fixedOfferType ? (
        <input type="hidden" name="offerType" value={fixedOfferType} />
      ) : (
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Tipo de oferta</label>
          <select name="offerType" defaultValue={defaults?.offerType ?? "REPARACION_SERVICIO"} className="w-full rounded-md border border-border px-3 py-2 text-sm">
            {Object.entries(QUOTE_OFFER_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Servicios / productos solicitados
        </legend>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[7rem_1fr_5rem_auto] sm:items-end">
            <select
              name="lineKind"
              value={line.kind}
              onChange={(e) =>
                updateLine(index, { kind: e.target.value === "PRODUCTO" ? "PRODUCTO" : "SERVICIO" })
              }
              className="rounded-md border border-border px-2 py-2 text-sm"
            >
              {Object.entries(QUOTE_LINE_KIND_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              name="lineDescription"
              required={index === 0}
              value={line.description}
              onChange={(e) => updateLine(index, { description: e.target.value })}
              placeholder="Descripción"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              name="lineQuantity"
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 1 })}
              className="rounded-md border border-border px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeLine(index)}
              className="text-xs font-semibold text-slate-500 hover:text-danger"
            >
              Quitar
            </button>
          </div>
        ))}
        <button type="button" onClick={addLine} className="text-xs font-semibold text-accent hover:underline">
          + Agregar línea
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Equipo (EQUI/MOT o preliminar §20.6)
        </legend>
        <select
          name="equipmentMode"
          value={equipmentMode}
          onChange={(e) => setEquipmentMode(e.target.value as typeof equipmentMode)}
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="none">Sin equipo vinculado aún</option>
          <option value="preliminary">Datos preliminares (sin EQUI/MOT)</option>
          <option value="equi">EQUI existente</option>
          <option value="mot">MOT existente</option>
        </select>
        {equipmentMode === "equi" && (
          <select name="equiId" defaultValue={defaults?.equiId} className="w-full rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Selecciona EQUI</option>
            {clientEqui.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        )}
        {equipmentMode === "mot" && (
          <select name="motId" defaultValue={defaults?.motId} className="w-full rounded-md border border-border px-3 py-2 text-sm">
            <option value="">Selecciona MOT</option>
            {clientMot.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        {equipmentMode === "preliminary" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="preliminaryBrand"
              defaultValue={defaults?.preliminaryBrand}
              placeholder="Marca"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              name="preliminaryModel"
              defaultValue={defaults?.preliminaryModel}
              placeholder="Modelo"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              name="preliminarySerial"
              defaultValue={defaults?.preliminarySerial}
              placeholder="Serie fabricante"
              className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              name="preliminaryNotes"
              defaultValue={defaults?.preliminaryNotes}
              placeholder="Observaciones del equipo"
              rows={2}
              className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="commercialReference"
          placeholder="Referencia comercial / PO"
          value={commercialReference}
          onChange={(e) => setCommercialReference(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-sm"
        />
        <textarea
          name="commercialNotes"
          placeholder="Observaciones comerciales"
          value={commercialNotes}
          onChange={(e) => setCommercialNotes(e.target.value)}
          rows={2}
          className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
        />
      </div>

      <fieldset className="space-y-2 rounded-lg border border-border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contactos destinatarios previstos
        </legend>
        {!activeClientId && <p className="text-xs text-slate-500">Selecciona un cliente para ver contactos.</p>}
        {activeClientId && clientContacts.length === 0 && (
          <p className="text-xs text-slate-600">
            Este cliente no tiene contactos activos. Podrás agregarlos en la ficha del cliente o al enviar la cotización.
          </p>
        )}
        {clientContacts.map((c) => (
          <label key={c.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="intendedContactIds"
              value={c.id}
              defaultChecked={defaults?.intendedContactIds?.includes(c.id)}
              className="mt-1"
            />
            <span>
              {c.name}
              {c.email && <span className="block text-xs text-slate-500">{c.email}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex gap-2">
        <button type="submit" className={buttonVariants({ variant: "primary" })}>
          {submitLabel}
        </button>
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
