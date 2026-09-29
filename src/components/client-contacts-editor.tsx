"use client";

import { useState } from "react";

type Row = { key: number };

export function ClientContactsEditor({ minRows = 1, maxRows = 8 }: { minRows?: number; maxRows?: number }) {
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: minRows }, (_, i) => ({ key: i })),
  );
  const [nextKey, setNextKey] = useState(minRows);

  function addRow() {
    if (rows.length >= maxRows) return;
    setRows((r) => [...r, { key: nextKey }]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((row) => row.key !== key));
  }

  return (
    <fieldset className="space-y-3 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">Contactos (opcionales)</legend>
      <p className="text-xs text-slate-500">
        Puedes agregar varios. Marca uno como principal; si no marcas ninguno, el primero con nombre será principal.
      </p>
      {rows.map((row, index) => (
        <div key={row.key} className="space-y-2 rounded-md border border-dashed border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase text-slate-500">Contacto {index + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                className="text-xs text-slate-500 hover:text-danger"
              >
                Quitar
              </button>
            )}
          </div>
          <input type="hidden" name={`contact_${row.key}_slot`} value={String(row.key)} />
          <input
            name={`contact_${row.key}_name`}
            placeholder="Nombre"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            name={`contact_${row.key}_phone`}
            placeholder="Teléfono"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            name={`contact_${row.key}_email`}
            placeholder="Correo"
            type="email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="primaryContactSlot" value={String(row.key)} defaultChecked={index === 0} />
            Contacto principal
          </label>
        </div>
      ))}
      {rows.length < maxRows && (
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-medium text-accent hover:underline"
        >
          + Agregar otro contacto
        </button>
      )}
    </fieldset>
  );
}
