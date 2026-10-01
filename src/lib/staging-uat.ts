import { headers } from "next/headers";

/** Staging systronia.com: UAT E2E sin bloqueos de modo pruebas en finanzas. */
export async function isStagingUatHost() {
  if (process.env.SYGOS_STAGING_UAT === "1") return true;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  return host.includes("systronia.com");
}
