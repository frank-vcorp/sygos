"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Field, FormActions, Input, Select, Textarea } from "@/components/ui/form-fields";
import { quickCreateHref } from "@/lib/quick-create-return";

type ClientOption = { id: string; name: string };

export function EquiNuevoForm({
  clientOptions,
  canCreateClient,
  initialClientId,
  model: initialModel = "",
  brand: initialBrand = "",
  equipmentType: initialEquipmentType = "",
  manufacturerSerial: initialSerial = "",
  description: initialDescription = "",
  createEquiAction,
}: {
  clientOptions: ClientOption[];
  canCreateClient: boolean;
  initialClientId?: string;
  model?: string;
  brand?: string;
  equipmentType?: string;
  manufacturerSerial?: string;
  description?: string;
  createEquiAction: (formData: FormData) => void;
}) {
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [model, setModel] = useState(initialModel);
  const [brand, setBrand] = useState(initialBrand);
  const [equipmentType, setEquipmentType] = useState(initialEquipmentType);
  const [manufacturerSerial, setManufacturerSerial] = useState(initialSerial);
  const [description, setDescription] = useState(initialDescription);

  const createClientHref = useMemo(
    () =>
      quickCreateHref("/app/clientes/nuevo", "/app/equi/nuevo", {
        model,
        brand,
        equipmentType,
        manufacturerSerial,
        description,
      }),
    [model, brand, equipmentType, manufacturerSerial, description],
  );

  return (
    <form action={createEquiAction} className="grid gap-4">
      <Field label="Cliente" hint="Propietario comercial del equipo">
        <Select
          name="clientId"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">Seleccionar…</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {canCreateClient && (
          <p className="mt-1 text-xs text-slate-600">
            ¿No existe?{" "}
            <Link href={createClientHref} className="font-semibold text-accent hover:underline">
              Crear cliente
            </Link>{" "}
            (conserva los datos del equipo al regresar).
          </p>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modelo">
          <Input name="model" required value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <Field label="Marca">
          <Input name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
      </div>
      <Field label="Tipo de equipo">
        <Input
          name="equipmentType"
          placeholder="Ej. Variador, PLC…"
          value={equipmentType}
          onChange={(e) => setEquipmentType(e.target.value)}
        />
      </Field>
      <Field label="Serial fabricante" hint="Opcional; no reemplaza al folio EQUI">
        <Input
          name="manufacturerSerial"
          value={manufacturerSerial}
          onChange={(e) => setManufacturerSerial(e.target.value)}
        />
      </Field>
      <Field label="Descripción">
        <Textarea name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <FormActions>
        <button type="submit" className={buttonVariants({ variant: "primary" })}>
          Crear EQUI
        </button>
        <Link href="/app/equi" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
      </FormActions>
    </form>
  );
}
