/** Rutas internas permitidas al regresar tras un alta rápida (§5). */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/app/")) return null;
  if (trimmed.includes("://") || trimmed.includes("..") || trimmed.includes("\n") || trimmed.includes("\r")) {
    return null;
  }
  return trimmed;
}

export function parsePreserveFromForm(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((val, key) => {
    if (key.startsWith("preserve_") && typeof val === "string" && val.length > 0) {
      out[key.slice("preserve_".length)] = val;
    }
  });
  return out;
}

export function buildQuickCreateReturnUrl(
  returnTo: string | null | undefined,
  entity: { key: string; value: string },
  preserve?: Record<string, string>,
): string | null {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return null;

  const qIndex = safe.indexOf("?");
  const path = qIndex >= 0 ? safe.slice(0, qIndex) : safe;
  const sp = new URLSearchParams(qIndex >= 0 ? safe.slice(qIndex + 1) : "");
  sp.set(entity.key, entity.value);
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v) sp.set(k, v);
    }
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export function quickCreateHref(
  createPath: string,
  returnTo: string,
  preserve?: Record<string, string>,
): string {
  const sp = new URLSearchParams();
  sp.set("returnTo", returnTo);
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v) sp.set(`preserve_${k}`, v);
    }
  }
  return `${createPath}?${sp.toString()}`;
}

export function redirectTargetAfterQuickCreate(
  formData: FormData,
  entityKey: string,
  entityId: string,
  fallback: string,
): string {
  const returnTo = String(formData.get("returnTo") ?? "");
  const preserve = parsePreserveFromForm(formData);
  const built = buildQuickCreateReturnUrl(returnTo, { key: entityKey, value: entityId }, preserve);
  return built ?? fallback;
}
