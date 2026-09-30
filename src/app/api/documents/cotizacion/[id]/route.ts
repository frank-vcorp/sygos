import { NextResponse } from "next/server";
import { getQuoteDetailForSession } from "@/app/app/cotizaciones/actions";
import { buildQuotePrintHtml } from "@/lib/documents/quote-delivery";
import { canSwitchActiveCompany } from "@/lib/permissions-company";
import { getSession, switchActiveCompany } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await context.params;
  const quote = await getQuoteDetailForSession(session, id);
  if (!quote) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  }
  if (quote.companyId !== session.activeCompany.id && canSwitchActiveCompany(session.role)) {
    await switchActiveCompany(session.id, quote.companyId);
  }
  const html = await buildQuotePrintHtml(quote.companyId, id);
  if (!html) {
    return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });
  }
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
