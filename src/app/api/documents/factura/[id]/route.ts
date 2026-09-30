import { NextResponse } from "next/server";
import { buildInvoicePrintHtml } from "@/lib/documents/invoice-delivery";
import { getSession } from "@/lib/session";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await context.params;
  const html = await buildInvoicePrintHtml(session.activeCompany.id, id);
  if (!html) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
