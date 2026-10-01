/** Etiquetas legibles para badges (custodia MOT / almacén EQUI). */
export const MOT_CUSTODY_STATUS_LABEL: Record<string, string> = {
  PENDIENTE_INGRESO_SERVOMOTORES: "Pendiente ingreso físico",
  EN_RESGUARDO_SERVOMOTORES: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  EGRESADO: "Egresado",
};

export const EQUI_WAREHOUSE_STATUS_LABEL: Record<string, string> = {
  SIN_ENTRADA: "Sin entrada",
  EN_RESGUARDO: "En resguardo",
  SALIDA_PRUEBA: "Salida a prueba",
  SALIDA_DEFINITIVA: "Salida definitiva",
};

export function formatStatusBadgeLabel(status: string): string {
  return (
    MOT_CUSTODY_STATUS_LABEL[status] ??
    EQUI_WAREHOUSE_STATUS_LABEL[status] ??
    status.replaceAll("_", " ")
  );
}
