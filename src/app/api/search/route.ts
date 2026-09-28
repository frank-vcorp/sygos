import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { canUseGlobalSearch } from "@/lib/permissions";
import { globalSearch } from "@/lib/global-search";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canUseGlobalSearch(session.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const hits = await globalSearch(session.activeCompany.id, q);
  return NextResponse.json({ hits });
}
