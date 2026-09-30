import { NextResponse } from "next/server";
import { readCompanyLogoFile } from "@/lib/company-brand-logo";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const file = await readCompanyLogoFile(session.activeCompany.id);
  if (!file) {
    return NextResponse.json({ error: "Sin logo configurado" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
