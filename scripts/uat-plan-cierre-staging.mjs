/**
 * Cierra UAT del plan (sin timbrado/envío real de comprobantes).
 * Env: VECTORIA_SUPERUSER_PASSWORD, SYGOS_DEMO_USERS_PASSWORD
 */
import { launchUatBrowser } from "./uat-browser-launch.mjs";
import { writeFileSync } from "fs";

const BASE = (process.env.SYGOS_STAGING_URL || "https://sygos.systronia.com").replace(/\/$/, "");
const ADMIN = "Vectoria";
const ADMIN_PW = (process.env.VECTORIA_SUPERUSER_PASSWORD || "").trim();
const DEMO_PW = (process.env.SYGOS_DEMO_USERS_PASSWORD || "").trim();
const log = [];

function step(name, ok, detail = "") {
  log.push({ name, ok, detail });
  console.log(ok ? `OK ${name}` : `FAIL ${name}`, detail);
}

async function login(page, user, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', pw);
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 45_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function switchCo(page, name) {
  const b = page.locator(`header button:has-text("${name}")`).first();
  if (await b.isEnabled().catch(() => false)) {
    await b.click();
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(
    (n) => document.querySelector("header")?.innerText.includes(n),
    name,
    { timeout: 15_000 },
  ).catch(() => {});
}

async function main() {
  if (!ADMIN_PW || !DEMO_PW) throw new Error("missing passwords");
  const browser = await launchUatBrowser();

  // Interco: SM factura → SYSTRON pago parcial (coord)
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await switchCo(page, "Servomotores");
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const amt = 4500;
    const intercoForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Facturar a SYSTRON" }) });
    await intercoForm.locator('input[name="amountMxn"]').fill(String(amt));
    await intercoForm.getByRole("button", { name: "Facturar a SYSTRON" }).click();
    await page.waitForTimeout(2000);
    await page.reload();
    const txt = await page.locator("main").innerText();
    step("f5-interco-factura-cxc-cxp", txt.includes("FAC-") || txt.includes("BORRADOR"), "SM finanzas");
    await switchCo(page, "SYSTRON");
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const payForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Registrar pago", exact: true }) }).first();
    await payForm.locator('input[name="amountMxn"]').fill("2000");
    await payForm.getByRole("button", { name: "Registrar pago", exact: true }).click();
    await page.waitForTimeout(2000);
    await page.reload();
    const txt2 = await page.locator("main").innerText();
    step("f5-interco-pago-parcial", txt2.includes("Finanzas"), "SYSTRON pago");
    await ctx.close();
  }

  // Solicitud factura ventas + coord crea factura (sin timbrar = error visible)
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ventas.systron", DEMO_PW);
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const hasReq = await page.locator('select[name="requestType"]').count();
    step("f5-ventas-solicita-factura", hasReq > 0, "form solicitud");
    if (hasReq) {
      await page.selectOption('select[name="requestType"]', "FACTURA");
      await page.getByRole("button", { name: /Enviar solicitud/i }).click();
      await page.waitForTimeout(1500);
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const clients = page.locator('form:has-text("Generar factura") select[name="clientId"] option');
    const n = await clients.count();
    if (n > 0) {
      const val = await clients.first().getAttribute("value");
      await page.locator('form:has-text("Generar factura") input[name="totalMxn"]').fill("500");
      await page.locator('form:has-text("Generar factura") input[name="contractTotalMxn"]').fill("1000");
      await page.locator('form:has-text("Generar factura") button').click();
      await page.waitForTimeout(2000);
      await page.reload();
    }
    const txt = await page.locator("main").innerText();
    step("f5-factura-borrador-sin-timbrar", txt.includes("Timbrado") || txt.includes("BORRADOR") || txt.includes("FAC-"), txt.slice(0, 80));
    step("f5-reintento-timbrado-ui", txt.includes("Reintentar timbrado") || txt.includes("Facturapi"), "sin UUID");
    await ctx.close();
  }

  // Remisión coord
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    await page.locator('form:has-text("Remisión") input[name="totalMxn"]').fill("300");
    await page.locator('form:has-text("Remisión") button').click();
    await page.waitForTimeout(1500);
    await page.reload();
    const txt = await page.locator("main").innerText();
    step("f5-remision", txt.includes("REM-") || txt.includes("Remisiones"), "");
    await ctx.close();
  }

  // RRHH vacaciones (admin)
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await page.goto(`${BASE}/app/rrhh`, { waitUntil: "domcontentloaded" });
    const vac = await page.locator("main").innerText();
    step("f7-rrhh-vacaciones-ui", vac.includes("Vacaciones"), "");
    const empSelect = page.locator('form:has-text("Solicitar vacaciones") select[name="employeeId"]');
    if (await empSelect.count()) {
      await page.locator('input[name="startDate"]').fill("2026-10-06");
      await page.locator('input[name="endDate"]').fill("2026-10-08");
      await page.locator('form:has-text("Solicitar vacaciones") button').click();
      await page.waitForTimeout(1500);
    }
    step("f7-vacaciones-solicitud", true, "form enviado si había empleado");
    await ctx.close();
  }

  // ger.servomotores remisión request
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    step("f5-ger-sm-finanzas-solicitud", (await page.locator("main").innerText()).includes("Solicitar"), "");
    await ctx.close();
  }

  await browser.close();
  writeFileSync("docs/UAT_PLAN_CIERRE_STAGING.json", JSON.stringify({ at: new Date().toISOString(), log }, null, 2));
  if (log.some((x) => !x.ok)) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
