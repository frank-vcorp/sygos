export function getPublicAppUrl() {
  const fromEnv =
    process.env.SYGOS_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://sygos.vector-ia.mx";
}
