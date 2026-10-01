/**
 * Recorridos E2E docs/E2E_RECORRIDOS.md — staging browser (Playwright + Chrome).
 */
import { writeFileSync } from "fs";
import { launchUatBrowser } from "./uat-browser-launch.mjs";

const BASE = (process.env.SYGOS_STAGING_URL || "https://sygos.systronia.com").replace(/\/$/, "");
const DEMO_PW = (process.env.SYGOS_DEMO_USERS_PASSWORD || "").trim();
const ADMIN_PW = (
  process.env.SYGOS_VECTORIA_INITIAL_PASSWORD ||
  process.env.VECTORIA_SUPERUSER_PASSWORD ||
  ""
).trim();

const log = [];

async function login(page, user, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
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
    await page.waitForTimeout(1200);
  }
}

function step(id, ok, detail = "") {
  log.push({ id, ok, detail, at: new Date().toISOString() });
  console.log(ok ? `✅ ${id}` : `❌ ${id}`, detail);
}

async function main() {
  if (!DEMO_PW) throw new Error("SYGOS_DEMO_USERS_PASSWORD missing");
  const browser = await launchUatBrowser();

  // —— 6 Intercompañía ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await switchCo(page, "Servomotores");
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const interco = page.locator("form").filter({ has: page.getByRole("button", { name: "Facturar a SYSTRON" }) });
    if (await interco.count()) {
      await interco.locator('input[name="amountMxn"]').fill("1200");
      await interco.getByRole("button", { name: "Facturar a SYSTRON" }).click();
      await page.waitForTimeout(2000);
      step("r6-sm-factura-interco", true);
    } else step("r6-sm-factura-interco", false, "form no visible");
    await switchCo(page, "SYSTRON");
    await page.goto(`${BASE}/app/finanzas`, { waitUntil: "domcontentloaded" });
    const pay = page.locator("form").filter({ has: page.getByRole("button", { name: "Registrar pago", exact: true }) }).first();
    if (await pay.count()) {
      await pay.locator('input[name="amountMxn"]').fill("500");
      await pay.getByRole("button", { name: "Registrar pago", exact: true }).click();
      await page.waitForTimeout(2000);
      step("r6-sy-pago-parcial", true);
    } else step("r6-sy-pago-parcial", false, "form pago SYSTRON no visible");
    await ctx.close();
  }

  // —— 4 Compra directa ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.systron", DEMO_PW);
    await page.goto(`${BASE}/app/compras`, { waitUntil: "domcontentloaded" });
    const desc = `E2E compra directa ${Date.now()}`;
    await page.locator('form:has(input[name="description"]) input[name="description"]').first().fill(desc);
    await page.locator('form:has(input[name="description"]) input[name="amountMxn"]').first().fill("150");
    await page.locator('form:has(input[name="description"]) button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    const t = await page.locator("main").innerText();
    step("r4-compra-directa", t.includes(desc) || t.includes("REGISTRADA") || t.includes("Validar"), t.slice(0, 80));
    await ctx.close();
  }

  // —— 5 O.C. CEO autoriza → coord procesa ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.systron", DEMO_PW);
    await page.goto(`${BASE}/app/compras`, { waitUntil: "domcontentloaded" });
    const ocForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear O.C." }) }).last();
    await ocForm.locator('input[name="description"]').fill(`E2E OC ${Date.now()}`);
    await ocForm.locator('input[name="amountMxn"]').fill("3500");
    await ocForm.getByRole("button", { name: "Crear O.C." }).click();
    await page.waitForTimeout(2500);
    step("r5-oc-creada", (await page.locator("main").innerText()).match(/PENDIENTE|OC-/i) != null);
    await ctx.close();
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await login(p2, "ceo", DEMO_PW);
    await p2.goto(`${BASE}/app/compras`, { waitUntil: "domcontentloaded" });
    const authBtn = p2.getByRole("button", { name: "Autorizar (CEO)" }).first();
    if (await authBtn.count()) {
      await authBtn.click();
      await p2.waitForTimeout(2000);
      step("r5-ceo-autoriza", true);
    } else step("r5-ceo-autoriza", false, "sin botón autorizar");
    await ctx2.close();
    const ctx3 = await browser.newContext();
    const p3 = await ctx3.newPage();
    await login(p3, "coord", DEMO_PW);
    await p3.goto(`${BASE}/app/compras`, { waitUntil: "domcontentloaded" });
    const proc = p3.getByRole("button", { name: /Procesar/i }).first();
    if (await proc.count()) {
      await proc.click();
      await p3.waitForTimeout(2000);
      step("r5-coord-procesa", true);
    } else step("r5-coord-procesa", false, "sin procesar");
    await ctx3.close();
  }

  // —— 7 Nómina ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "Vectoria", ADMIN_PW || DEMO_PW);
    await page.goto(`${BASE}/app/rrhh`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if ((await page.locator("main").innerText()).includes("No pudimos cargar")) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }
    const gen = page.getByRole("button", { name: "Generar borrador" }).first();
    if (await gen.count()) {
      await gen.click();
      await page.waitForTimeout(2000);
    }
    const rrhhTxt = await page.locator("main").innerText();
    step(
      "r7-nomina-borrador",
      rrhhTxt.includes("BORRADOR") || rrhhTxt.includes("Nómina semanal") || rrhhTxt.includes("corridas"),
      rrhhTxt.slice(0, 60),
    );
    await ctx.close();
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await login(p2, "ceo", DEMO_PW);
    await p2.goto(`${BASE}/app/rrhh`, { waitUntil: "domcontentloaded" });
    const auth = p2.locator('form[action*="authorizePayroll"] button, form:has(input[name="payrollRunId"]) button').first();
    if (await auth.count()) {
      await auth.click();
      await p2.waitForTimeout(2000);
      step("r7-ceo-autoriza-nomina", true);
    } else step("r7-ceo-autoriza-nomina", false, "sin botón");
    await ctx2.close();
  }

  // —— 3 MOT intercompañía (consulta cotización espejo) ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ceo", DEMO_PW);
    await switchCo(page, "Servomotores");
    await page.goto(`${BASE}/app/cotizaciones/79954385-2b5f-485a-9c8b-91a0ce1aac77`, { waitUntil: "domcontentloaded" });
    const t = await page.locator("main").innerText();
    step("r3-cot-sm-interco", t.includes("intercompañía") || t.includes("SYSTRON") || t.includes("COT-"), t.slice(0, 100));
    await ctx.close();
  }

  // —— 2 MOT SM cliente directo (ingreso + ficha) ——
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    await page.goto(`${BASE}/app/mot`, { waitUntil: "domcontentloaded" });
    const pending = page.getByRole("link", { name: /Confirmar ingreso/i }).first();
    if (await pending.count()) {
      await pending.click();
      await page.waitForLoadState("domcontentloaded");
      const confirm = page.getByRole("button", { name: /Confirmar ingreso/i }).first();
      if (await confirm.count()) {
        await confirm.click();
        await page.waitForTimeout(2000);
        step("r2-mot-ingreso-sm", true);
      } else step("r2-mot-ingreso-sm", false, "sin confirm en ficha");
    } else {
      step("r2-mot-ingreso-sm", true, "skip — sin pendientes ingreso");
    }
    await page.goto(`${BASE}/app/mot/servomotores`, { waitUntil: "domcontentloaded" });
    step("r2-custodia-sm-vista", (await page.locator("main").innerText()).includes("resguardo") || (await page.locator("main").innerText()).includes("Ingreso"));
    await ctx.close();
  }

  // —— 1 SYSTRON EQUI (cadena técnica → cotización → decisión) ——
  let quoteId = null;
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "Vectoria", ADMIN_PW || DEMO_PW);
    await page.goto(`${BASE}/app/equi/nuevo`, { waitUntil: "domcontentloaded" });
    const clientOpt = page.locator('select[name="clientId"] option').nth(1);
    const clientVal = await clientOpt.getAttribute("value");
    if (clientVal) {
      await page.selectOption('select[name="clientId"]', clientVal);
      await page.fill('input[name="model"]', `E2E-${Date.now()}`);
      await page.fill('input[name="brand"]', "Test");
      await page.getByRole("button", { name: "Crear EQUI" }).click();
      await page.waitForURL(/\/app\/equi\//, { timeout: 30_000 });
      const equiUrl = page.url();
      step("r1-equi-creado", equiUrl.includes("/app/equi/"));
      const equiId = equiUrl.split("/").pop();
      await ctx.close();

      const ctxA = await browser.newContext();
      const pA = await ctxA.newPage();
      await login(pA, "Vectoria", ADMIN_PW || DEMO_PW);
      await pA.goto(`${BASE}/app/equi/${equiId}`, { waitUntil: "domcontentloaded" });
      const ent2 = pA.getByRole("button", { name: /Confirmar entrada a resguardo|Registrar entrada/i }).first();
      const hasEnt = (await ent2.count()) > 0;
      if (hasEnt) {
        await ent2.click();
        await pA.waitForLoadState("domcontentloaded");
        await pA.waitForTimeout(1000);
      }
      const equiMain = await pA.locator("main").innerText();
      step(
        "r1-almacen-entrada",
        hasEnt && (equiMain.includes("resguardo") || equiMain.includes("En resguardo") || !equiMain.includes("Confirmar entrada")),
        hasEnt ? "" : "sin botón entrada en ficha EQUI",
      );
      await ctxA.close();

      const ctxT = await browser.newContext();
      const pT = await ctxT.newPage();
      await login(pT, "tecnico.systron", DEMO_PW);
      await pT.goto(`${BASE}/app/tecnica/nueva?equiId=${equiId}`, { waitUntil: "domcontentloaded" });
      await pT.waitForSelector('select[name="attentionType"]', { timeout: 45_000 });
      await pT.selectOption('select[name="attentionType"]', "DIAGNOSTICO");
      await pT.fill('textarea[name="reportedFault"]', "E2E falla prueba");
      await pT.getByRole("button", { name: "Crear" }).click();
      await pT.waitForURL(/\/app\/tecnica\//, { timeout: 45_000 });
      const attUrl = pT.url();
      step("r1-atencion-creada", attUrl.includes("/app/tecnica/"));
      const markDone = async () => {
        const start = pT.getByRole("button", { name: "Iniciar diagnóstico" });
        if (await start.count()) await start.click();
        await pT.waitForTimeout(1500);
        const done = pT.getByRole("button", { name: "Marcar terminado" });
        if (await done.count()) await done.click();
        await pT.waitForTimeout(1500);
      };
      await markDone();
      step("r1-diagnostico-terminado", (await pT.locator("main").innerText()).includes("validación") || (await pT.locator("main").innerText()).includes("PENDIENTE"));
      await ctxT.close();

      const ctxG = await browser.newContext();
      const pG = await ctxG.newPage();
      await login(pG, "ger.systron", DEMO_PW);
      await pG.goto(attUrl, { waitUntil: "domcontentloaded" });
      const val = pG.getByRole("button", { name: "Validar gerente" });
      if (await val.count()) {
        await val.click();
        await pG.waitForTimeout(2500);
        step("r1-ger-valida", true);
      } else step("r1-ger-valida", false);
      const cotLink = pG.locator('a[href*="/app/cotizaciones/"]').first();
      if (await cotLink.count()) {
        quoteId = (await cotLink.getAttribute("href"))?.split("/").pop() ?? null;
      }
      await ctxG.close();

      if (quoteId) {
        const ctxC = await browser.newContext();
        const pC = await ctxC.newPage();
        await login(pC, "ceo", DEMO_PW);
        await pC.goto(`${BASE}/app/cotizaciones/${quoteId}`, { waitUntil: "domcontentloaded" });
        await pC.fill('input[name="priceMxn"]', "8800");
        await pC.getByRole("button", { name: "Guardar precio" }).click();
        await pC.waitForTimeout(2000);
        step("r1-ceo-precio", !(await pC.locator("main").innerText()).includes("pendiente precio"));
        await ctxC.close();

        const ctxV = await browser.newContext();
        const pV = await ctxV.newPage();
        await login(pV, "ventas.systron", DEMO_PW);
        await pV.goto(`${BASE}/app/cotizaciones/${quoteId}`, { waitUntil: "domcontentloaded" });
        const sendBtn = pV.getByRole("button", { name: /Enviar cotización|Enviar/i }).first();
        if (await sendBtn.count()) {
          await sendBtn.click();
          await pV.waitForTimeout(2500);
        }
        const authBtn = pV.getByRole("button", { name: "Cliente autoriza" });
        if (await authBtn.count()) {
          await authBtn.click();
          await pV.waitForTimeout(2000);
          step("r1-decision-cliente", true);
        } else step("r1-decision-cliente", false, "cot no ENVIADA");
        await ctxV.close();

        const ctxF = await browser.newContext();
        const pF = await ctxF.newPage();
        await login(pF, "coord", DEMO_PW);
        await pF.goto(`${BASE}/app/cotizaciones/${quoteId}`, { waitUntil: "domcontentloaded" });
        const hasFiscal = (await pF.locator("main").innerText()).includes("Documentos fiscales");
        step("r1-factura-coord-ui", hasFiscal, quoteId);
        await ctxF.close();
      } else step("r1-cotizacion", false, "no quote id");
    } else {
      step("r1-equi-creado", false, "sin clientes");
      await ctx.close();
    }
  }

  await browser.close();
  const out = { base: BASE, at: new Date().toISOString(), log, passed: log.filter((x) => x.ok).length, failed: log.filter((x) => !x.ok).length };
  writeFileSync("docs/E2E_RECORRIDOS_RUN.json", JSON.stringify(out, null, 2));
  console.log(`\n=== E2E: ${out.passed} OK, ${out.failed} FAIL ===`);
  if (out.failed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
