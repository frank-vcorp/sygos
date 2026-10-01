import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  clientContacts,
  equiUnits,
  motUnits,
  quoteIntendedContacts,
  quoteLines,
  quotes,
} from "@/db/schema";
import type * as schema from "@/db/schema";

export type ParsedQuoteCommercialInput = {
  offerType: "DIAGNOSTICO" | "REPARACION_SERVICIO" | "SERVICIO_CAMPO" | "VENTA_EQUIPO";
  commercialReference: string | null;
  commercialNotes: string | null;
  equiId: string | null;
  motId: string | null;
  preliminaryBrand: string | null;
  preliminaryModel: string | null;
  preliminarySerial: string | null;
  preliminaryNotes: string | null;
  lines: { kind: "SERVICIO" | "PRODUCTO"; description: string; quantity: number }[];
  intendedContactIds: string[];
};

type Db = PostgresJsDatabase<typeof schema>;

export function parseQuoteCommercialFormData(formData: FormData): ParsedQuoteCommercialInput {
  const offerType = String(formData.get("offerType") ?? "REPARACION_SERVICIO") as ParsedQuoteCommercialInput["offerType"];
  const validOffers = ["DIAGNOSTICO", "REPARACION_SERVICIO", "SERVICIO_CAMPO", "VENTA_EQUIPO"] as const;
  if (!validOffers.includes(offerType)) {
    throw new Error("Tipo de oferta inválido");
  }

  const kinds = formData.getAll("lineKind").map(String);
  const descriptions = formData.getAll("lineDescription").map(String);
  const quantities = formData.getAll("lineQuantity").map((v) => Number(v));

  const lines: ParsedQuoteCommercialInput["lines"] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i]?.trim() ?? "";
    if (!description) continue;
    const kindRaw = kinds[i] ?? "SERVICIO";
    const kind = kindRaw === "PRODUCTO" ? "PRODUCTO" : "SERVICIO";
    const quantity = Math.max(1, Math.floor(quantities[i] ?? 1) || 1);
    lines.push({ kind, description, quantity });
  }
  if (lines.length === 0) {
    throw new Error("Agrega al menos una línea de servicio o producto con cantidad");
  }

  const equipmentMode = String(formData.get("equipmentMode") ?? "none");
  let equiId: string | null = null;
  let motId: string | null = null;
  let preliminaryBrand: string | null = null;
  let preliminaryModel: string | null = null;
  let preliminarySerial: string | null = null;
  let preliminaryNotes: string | null = null;

  if (equipmentMode === "equi") {
    equiId = String(formData.get("equiId") ?? "").trim() || null;
    if (!equiId) throw new Error("Selecciona un EQUI o usa datos preliminares");
  } else if (equipmentMode === "mot") {
    motId = String(formData.get("motId") ?? "").trim() || null;
    if (!motId) throw new Error("Selecciona un MOT o usa datos preliminares");
  } else if (equipmentMode === "preliminary") {
    preliminaryBrand = String(formData.get("preliminaryBrand") ?? "").trim() || null;
    preliminaryModel = String(formData.get("preliminaryModel") ?? "").trim() || null;
    preliminarySerial = String(formData.get("preliminarySerial") ?? "").trim() || null;
    preliminaryNotes = String(formData.get("preliminaryNotes") ?? "").trim() || null;
    const hasPrelim =
      preliminaryBrand || preliminaryModel || preliminarySerial || preliminaryNotes;
    if (!hasPrelim) {
      throw new Error("Captura al menos un dato preliminar del equipo (marca, modelo, serie u observación)");
    }
  }

  const intendedContactIds = formData.getAll("intendedContactIds").map(String).filter(Boolean);

  return {
    offerType,
    commercialReference: String(formData.get("commercialReference") ?? "").trim() || null,
    commercialNotes: String(formData.get("commercialNotes") ?? "").trim() || null,
    equiId,
    motId,
    preliminaryBrand,
    preliminaryModel,
    preliminarySerial,
    preliminaryNotes,
    lines,
    intendedContactIds,
  };
}

export async function assertQuoteCommercialEquipment(
  db: Db,
  companyId: string,
  companyCode: string,
  clientId: string,
  input: Pick<ParsedQuoteCommercialInput, "equiId" | "motId">,
) {
  if (input.equiId) {
    const [e] = await db
      .select({ clientId: equiUnits.clientId })
      .from(equiUnits)
      .where(and(eq(equiUnits.id, input.equiId), eq(equiUnits.companyId, companyId)))
      .limit(1);
    if (!e) throw new Error("EQUI no encontrado en esta empresa");
    if (e.clientId !== clientId) throw new Error("El EQUI seleccionado no pertenece al cliente");
  }
  if (input.motId) {
    const [m] = await db
      .select({
        systronClientId: motUnits.systronClientId,
        servomotoresClientId: motUnits.servomotoresClientId,
      })
      .from(motUnits)
      .where(eq(motUnits.id, input.motId))
      .limit(1);
    if (!m) throw new Error("MOT no encontrado");
    const motClientId =
      companyCode === "SYSTRON" ? m.systronClientId : m.servomotoresClientId;
    if (motClientId && motClientId !== clientId) {
      throw new Error("El MOT seleccionado no pertenece al cliente");
    }
  }
}

export async function assertIntendedContacts(db: Db, clientId: string, contactIds: string[]) {
  if (contactIds.length === 0) return;
  const rows = await db
    .select({ id: clientContacts.id })
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.clientId, clientId),
        eq(clientContacts.active, true),
        inArray(clientContacts.id, contactIds),
      ),
    );
  if (rows.length !== contactIds.length) {
    throw new Error("Uno o más contactos no pertenecen al cliente");
  }
}

export function deriveEquipmentMode(quote: {
  equiId: string | null;
  motId: string | null;
  preliminaryBrand: string | null;
  preliminaryModel: string | null;
  preliminarySerial: string | null;
  preliminaryNotes: string | null;
}): "none" | "equi" | "mot" | "preliminary" {
  if (quote.equiId) return "equi";
  if (quote.motId) return "mot";
  if (
    quote.preliminaryBrand ||
    quote.preliminaryModel ||
    quote.preliminarySerial ||
    quote.preliminaryNotes
  ) {
    return "preliminary";
  }
  return "none";
}

export async function replaceQuoteCommercialDetails(
  db: Db,
  quoteId: string,
  input: ParsedQuoteCommercialInput,
) {
  await db.delete(quoteLines).where(eq(quoteLines.quoteId, quoteId));
  await db.delete(quoteIntendedContacts).where(eq(quoteIntendedContacts.quoteId, quoteId));

  if (input.lines.length) {
    await db.insert(quoteLines).values(
      input.lines.map((line, sortOrder) => ({
        quoteId,
        kind: line.kind,
        description: line.description,
        quantity: line.quantity,
        sortOrder,
      })),
    );
  }

  if (input.intendedContactIds.length) {
    await db.insert(quoteIntendedContacts).values(
      input.intendedContactIds.map((contactId) => ({ quoteId, contactId })),
    );
  }

  await db
    .update(quotes)
    .set({
      offerType: input.offerType,
      commercialReference: input.commercialReference,
      commercialNotes: input.commercialNotes,
      equiId: input.equiId,
      motId: input.motId,
      preliminaryBrand: input.preliminaryBrand,
      preliminaryModel: input.preliminaryModel,
      preliminarySerial: input.preliminarySerial,
      preliminaryNotes: input.preliminaryNotes,
    })
    .where(eq(quotes.id, quoteId));
}
