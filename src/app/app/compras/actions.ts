"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { purchaseOrders, purchases } from "@/db/schema";
import { settlePurchaseAsDisbursement, settlePurchaseAsPayable } from "@/lib/purchase-settlement";
import { nextCompanyFolio } from "@/lib/folio";
import {
  assertDirectPurchaseAllowed,
  currentCalendarMonth,
  getPurchaseLimits,
  monthlyCommittedMxn,
} from "@/lib/purchase-budget";
import {
  canAccessPurchases,
  canAuthorizePurchaseOrder,
  canEditDirectPurchase,
  canProcessPurchaseOrder,
} from "@/lib/permissions-purchases";
import { getSession } from "@/lib/session";

export async function listPurchases(companyId: string) {
  const db = getDb();
  return db.select().from(purchases).where(eq(purchases.companyId, companyId)).orderBy(desc(purchases.createdAt)).limit(100);
}

export async function listPurchaseOrders(companyId: string) {
  const db = getDb();
  return db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.companyId, companyId))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(100);
}

export async function getPurchaseBudgetSummary(companyId: string) {
  const month = currentCalendarMonth();
  const limits = await getPurchaseLimits(companyId);
  const used = await monthlyCommittedMxn(companyId, month);
  return { month, ...limits, usedMxn: used, remainingMxn: Math.max(0, limits.monthlyBudgetMxn - used) };
}

export async function createPurchaseAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canAccessPurchases(session)) throw new Error("Sin permiso");

  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const description = String(formData.get("description") ?? "").trim();
  const month = currentCalendarMonth();
  const limits = await getPurchaseLimits(session.activeCompany.id);
  const db = getDb();

  let requiresCeo = amountMxn > limits.maxDirectMxn;
  const status: (typeof purchases.$inferInsert)["status"] = "REGISTRADA";

  if (!requiresCeo) {
    try {
      await assertDirectPurchaseAllowed(session.activeCompany.id, amountMxn);
    } catch {
      requiresCeo = true;
    }
  }

  if (requiresCeo) {
    await db.insert(purchases).values({
      companyId: session.activeCompany.id,
      description,
      amountMxn,
      calendarMonth: month,
      requiresCeoAuth: true,
      status: "PENDIENTE_OC",
      createdByUserId: session.id,
    });
    revalidatePath("/app/compras");
    return;
  }

  await db.insert(purchases).values({
    companyId: session.activeCompany.id,
    description,
    amountMxn,
    calendarMonth: month,
    requiresCeoAuth: false,
    status,
    createdByUserId: session.id,
  });
  revalidatePath("/app/compras");
}

export async function createPurchaseOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canAccessPurchases(session)) throw new Error("Sin permiso");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const description = String(formData.get("description") ?? "").trim();
  const purchaseId = String(formData.get("purchaseId") ?? "") || null;
  const db = getDb();
  const n = await nextCompanyFolio(session.activeCompany.id, "PO");
  const isCeo = canAuthorizePurchaseOrder(session);
  const [po] = await db
    .insert(purchaseOrders)
    .values({
      companyId: session.activeCompany.id,
      folio: `OC-${n.padStart(4, "0")}`,
      description,
      amountMxn,
      status: isCeo ? "AUTORIZADA" : "PENDIENTE_AUTORIZACION",
      authorizedByUserId: isCeo ? session.id : null,
      createdByUserId: session.id,
    })
    .returning();

  if (purchaseId) {
    await db
      .update(purchases)
      .set({ purchaseOrderId: po.id, status: "AUTORIZADA" })
      .where(eq(purchases.id, purchaseId));
  }
  revalidatePath("/app/compras");
}

export async function authorizePurchaseOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canAuthorizePurchaseOrder(session)) throw new Error("Solo CEO");
  const poId = String(formData.get("purchaseOrderId") ?? "");
  const db = getDb();
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
  await db
    .update(purchaseOrders)
    .set({
      status: "AUTORIZADA",
      authorizedByUserId: session.id,
      authorizedAmountMxn: po?.amountMxn,
    })
    .where(eq(purchaseOrders.id, poId));
  revalidatePath("/app/compras");
  revalidatePath("/app/paneles/ceo");
}

export async function processPurchaseOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canProcessPurchaseOrder(session)) throw new Error("Sin permiso");
  const poId = String(formData.get("purchaseOrderId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const db = getDb();
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
  if (!po || po.status !== "AUTORIZADA") throw new Error("O.C. no autorizada");

  const settlement = String(formData.get("settlement") ?? "CXP");
  const [purchase] = await db
    .insert(purchases)
    .values({
      companyId: session.activeCompany.id,
      supplierId,
      purchaseOrderId: po.id,
      description: po.description,
      amountMxn: po.amountMxn,
      calendarMonth: currentCalendarMonth(),
      status: "VALIDADA",
      requiresCeoAuth: true,
      createdByUserId: session.id,
    })
    .returning();

  if (settlement === "EGRESO") {
    await settlePurchaseAsDisbursement(
      session.activeCompany.id,
      purchase.id,
      po.description,
      po.amountMxn,
      supplierId,
    );
  } else if (supplierId) {
    await settlePurchaseAsPayable(session.activeCompany.id, purchase.id, supplierId, po.amountMxn);
  }

  await db.update(purchaseOrders).set({ status: "PROCESADA" }).where(eq(purchaseOrders.id, poId));
  revalidatePath("/app/compras");
}

export async function validateDirectPurchaseAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canProcessPurchaseOrder(session)) throw new Error("Sin permiso");
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const settlement = String(formData.get("settlement") ?? "CXP");
  const db = getDb();
  const [p] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!p || p.status === "VALIDADA" || p.status === "CANCELADA") throw new Error("Compra no válida");
  if (p.purchaseOrderId) throw new Error("Use flujo O.C.");

  await db.update(purchases).set({ status: "VALIDADA", supplierId }).where(eq(purchases.id, purchaseId));
  if (settlement === "EGRESO") {
    await settlePurchaseAsDisbursement(session.activeCompany.id, purchaseId, p.description, p.amountMxn, supplierId);
  } else if (supplierId) {
    await settlePurchaseAsPayable(session.activeCompany.id, purchaseId, supplierId, p.amountMxn);
  }
  revalidatePath("/app/compras");
}

export async function editPurchaseOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canAccessPurchases(session)) throw new Error("Sin permiso");
  const poId = String(formData.get("purchaseOrderId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const description = String(formData.get("description") ?? "").trim();
  const db = getDb();
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId)).limit(1);
  if (!po || po.status === "PROCESADA" || po.status === "CANCELADA") throw new Error("O.C. no editable");
  const authAmount = po.authorizedAmountMxn ?? po.amountMxn;
  const materialChange = Math.abs(amountMxn - authAmount) > authAmount * 0.05 || description !== po.description;
  if (materialChange && po.status === "AUTORIZADA") {
    await db
      .update(purchaseOrders)
      .set({
        amountMxn,
        description,
        status: "PENDIENTE_AUTORIZACION",
        authorizedByUserId: null,
        authorizedAmountMxn: null,
      })
      .where(eq(purchaseOrders.id, poId));
  } else {
    await db.update(purchaseOrders).set({ amountMxn, description }).where(eq(purchaseOrders.id, poId));
  }
  revalidatePath("/app/compras");
}

export async function editDirectPurchaseAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canEditDirectPurchase(session)) throw new Error("Sin permiso");
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const amountMxn = Number(formData.get("amountMxn") ?? 0);
  const description = String(formData.get("description") ?? "").trim();
  const db = getDb();
  const [p] = await db.select().from(purchases).where(eq(purchases.id, purchaseId)).limit(1);
  if (!p || p.purchaseOrderId) throw new Error("Solo compras directas");

  const limits = await getPurchaseLimits(session.activeCompany.id);
  const month = p.calendarMonth;
  const used = await monthlyCommittedMxn(session.activeCompany.id, month);
  const usedWithout = used - p.amountMxn;
  const overBudget = usedWithout + amountMxn > limits.monthlyBudgetMxn;
  const overMax = amountMxn > limits.maxDirectMxn;

  if (overBudget || overMax) {
    await db
      .update(purchases)
      .set({ amountMxn, description, status: "PENDIENTE_OC", requiresCeoAuth: true })
      .where(eq(purchases.id, purchaseId));
  } else {
    await db.update(purchases).set({ amountMxn, description, status: "REGISTRADA" }).where(eq(purchases.id, purchaseId));
  }
  revalidatePath("/app/compras");
}

export async function cancelDirectPurchaseAction(formData: FormData) {
  const session = await getSession();
  if (!session || !canEditDirectPurchase(session)) throw new Error("Sin permiso");
  const purchaseId = String(formData.get("purchaseId") ?? "");
  const db = getDb();
  await db.update(purchases).set({ status: "CANCELADA" }).where(eq(purchases.id, purchaseId));
  revalidatePath("/app/compras");
}

export async function cancelPurchaseOrderAction(formData: FormData) {
  const session = await getSession();
  if (!session || (!canAuthorizePurchaseOrder(session) && !canProcessPurchaseOrder(session))) {
    throw new Error("Sin permiso");
  }
  const poId = String(formData.get("purchaseOrderId") ?? "");
  const reason = String(formData.get("cancelReason") ?? "").trim();
  const db = getDb();
  await db
    .update(purchaseOrders)
    .set({ status: "CANCELADA", cancelReason: reason })
    .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.companyId, session.activeCompany.id)));
  revalidatePath("/app/compras");
}
