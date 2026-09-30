import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companySettings } from "@/db/schema";
import { ensureCompanySettings } from "@/lib/company-settings";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export function getSygosDataDir() {
  const base = process.env.SYGOS_DATA_DIR?.trim() || path.join(process.cwd(), "data");
  return path.resolve(base);
}

function logoRelativePath(companyId: string, ext: string) {
  return path.join("company-logos", `${companyId}.${ext}`);
}

function logoAbsolutePath(relative: string) {
  return path.join(getSygosDataDir(), relative);
}

export async function ensureBrandLogoDir() {
  await mkdir(path.join(getSygosDataDir(), "company-logos"), { recursive: true });
}

export async function readCompanyLogoFile(companyId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const settings = await ensureCompanySettings(companyId);
  if (!settings.brandLogoPath || !settings.brandLogoMimeType) return null;
  try {
    const buffer = await readFile(logoAbsolutePath(settings.brandLogoPath));
    return { buffer, mimeType: settings.brandLogoMimeType };
  } catch {
    return null;
  }
}

export async function getCompanyLogoDataUrl(companyId: string): Promise<string | null> {
  const file = await readCompanyLogoFile(companyId);
  if (!file) return null;
  return `data:${file.mimeType};base64,${file.buffer.toString("base64")}`;
}

export async function saveCompanyLogoFromUpload(companyId: string, file: File) {
  if (!file.size) throw new Error("Selecciona un archivo de imagen");
  if (file.size > MAX_BYTES) throw new Error("El logo debe pesar menos de 2 MB");

  const mime = file.type?.toLowerCase() || "";
  const ext = ALLOWED_MIME.get(mime);
  if (!ext) throw new Error("Formato no permitido. Usa PNG, JPEG o WebP.");

  const bytes = Buffer.from(await file.arrayBuffer());
  await ensureBrandLogoDir();

  const settings = await ensureCompanySettings(companyId);
  if (settings.brandLogoPath) {
    try {
      await unlink(logoAbsolutePath(settings.brandLogoPath));
    } catch {
      /* sin archivo previo */
    }
  }

  const relative = logoRelativePath(companyId, ext);
  await writeFile(logoAbsolutePath(relative), bytes);

  const db = getDb();
  await db
    .insert(companySettings)
    .values({
      companyId,
      brandLogoPath: relative,
      brandLogoMimeType: mime,
    })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: {
        brandLogoPath: relative,
        brandLogoMimeType: mime,
        updatedAt: sql`now()`,
      },
    });

  return { mimeType: mime };
}

export async function removeCompanyLogo(companyId: string) {
  const settings = await ensureCompanySettings(companyId);
  if (settings.brandLogoPath) {
    try {
      await unlink(logoAbsolutePath(settings.brandLogoPath));
    } catch {
      /* ya eliminado */
    }
  }
  const db = getDb();
  await db
    .update(companySettings)
    .set({ brandLogoPath: null, brandLogoMimeType: null, updatedAt: sql`now()` })
    .where(eq(companySettings.companyId, companyId));
}
