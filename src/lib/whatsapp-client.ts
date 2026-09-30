/** Implementación Baileys en commit dedicado; stub para compilación incremental. */
export async function sendWhatsAppDocument(
  _companyId: string,
  _input: { toPhone: string; message: string },
) {
  return { ok: false as const, error: "WhatsApp aún no vinculado" };
}
