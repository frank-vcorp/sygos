import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { attendances, equiUnits, quotes } from "@/db/schema";

/** Invalida vistas enlazadas del tronco Cliente → EQUI/MOT → Técnica → Cotización. */
export async function revalidateCommercialHub(opts: {
  clientId?: string | null;
  equiId?: string | null;
  motId?: string | null;
  attendanceId?: string | null;
  quoteId?: string | null;
}) {
  if (opts.attendanceId) revalidatePath(`/app/tecnica/${opts.attendanceId}`);
  if (opts.quoteId) revalidatePath(`/app/cotizaciones/${opts.quoteId}`);
  revalidatePath("/app/cotizaciones/pendientes");

  let clientId = opts.clientId ?? null;
  let equiId = opts.equiId ?? null;

  const db = getDb();
  if (opts.quoteId && (!clientId || !equiId)) {
    const [q] = await db.select().from(quotes).where(eq(quotes.id, opts.quoteId)).limit(1);
    if (q) {
      clientId = clientId ?? q.clientId;
      if (q.attendanceId && !equiId) {
        const [att] = await db.select().from(attendances).where(eq(attendances.id, q.attendanceId)).limit(1);
        equiId = att?.equiId ?? null;
      }
    }
  }

  let motId = opts.motId ?? null;
  if (opts.attendanceId && (!equiId || !motId)) {
    const [att] = await db.select().from(attendances).where(eq(attendances.id, opts.attendanceId)).limit(1);
    equiId = equiId ?? att?.equiId ?? null;
    motId = motId ?? att?.motId ?? null;
  }

  if (opts.quoteId && !motId) {
    const [q] = await db.select().from(quotes).where(eq(quotes.id, opts.quoteId)).limit(1);
    if (q?.attendanceId) {
      const [att] = await db.select().from(attendances).where(eq(attendances.id, q.attendanceId)).limit(1);
      motId = att?.motId ?? null;
    }
  }

  if (equiId && !clientId) {
    const [e] = await db
      .select({ clientId: equiUnits.clientId })
      .from(equiUnits)
      .where(eq(equiUnits.id, equiId))
      .limit(1);
    clientId = e?.clientId ?? null;
  }

  if (equiId) revalidatePath(`/app/equi/${equiId}`);
  if (motId) revalidatePath(`/app/mot/${motId}`);
  if (clientId) revalidatePath(`/app/clientes/${clientId}`);
}
