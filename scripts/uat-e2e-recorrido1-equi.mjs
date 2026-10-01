/**
 * Recorrido 1 completo — SYSTRON EQUI → almacén → técnica → cotización → decisión → factura (coord).
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
function step(id, ok, detail = "") {
  log.push({ id, ok, detail, at: new Date().toISOString() });
  console.log(ok ? `✅ ${id}` : `❌ ${id}`, detail);
}

async function login(page, user, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', pw);
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 45_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  if (!DEMO_PW || !ADMIN_PW) throw new Error("missing passwords");
  const browser = await launchUatBrowser();
  let equiId = null;
  let attUrl = null;
  let quoteId = null;

  // 1 — Alta EQUI (Vectoria / SYSTRON)
  {
    const page = await browser.newPage();
    await login(page, "Vectoria", ADMIN_PW);
    await page.goto(`${BASE}/app/equi/nuevo`, { waitUntil: "domcontentloaded" });
    const opt = page.locator('select[name="clientId"] option').nth(1);
    const clientVal = await opt.getAttribute("value");
    const clientLabel = await opt.innerText();
    if (!clientVal) {
      step("r1-01-equi", false, "sin clientes");
      await browser.close();
      process.exit(1);
    }
    const model = `E2E-R1-${Date.now()}`;
    await page.selectOption('select[name="clientId"]', clientVal);
    await page.fill('input[name="model"]', model);
    await page.fill('input[name="brand"]', "Recorrido1");
    await page.getByRole("button", { name: "Crear EQUI" }).click();
    await page.waitForURL(/\/app\/equi\/[0-9a-f-]+/, { timeout: 45_000 });
    equiId = new URL(page.url()).pathname.split("/").pop();
    step("r1-01-equi", Boolean(equiId), `${model} · cliente ${clientLabel.trim()}`);
    await page.close();
  }

  // 2 — Entrada física (ficha EQUI + fallback Almacén)
  {
    const page = await browser.newPage();
    await login(page, "almacen.systron", DEMO_PW);
    const assertResguardo = async () => {
      await page.goto(`${BASE}/app/equi/${equiId}`, { waitUntil: "domcontentloaded" });
      const t = await page.locator("main").innerText();
      return t.includes("En resguardo") && !t.includes("Sin entrada");
    };
    await page.goto(`${BASE}/app/equi/${equiId}`, { waitUntil: "domcontentloaded" });
    let ok = await assertResguardo();
    if (!ok) {
      const btn = page.getByRole("button", { name: "Confirmar entrada a resguardo" });
      if (await btn.count()) {
        await Promise.all([
          page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
          btn.click(),
        ]);
        for (let i = 0; i < 12; i++) {
          await page.waitForTimeout(1500);
          ok = await assertResguardo();
          if (ok) break;
        }
      }
    }
    if (!ok) {
      await page.goto(`${BASE}/app/almacen`, { waitUntil: "domcontentloaded" });
      const rowBtn = page.locator(`main li:has(a[href="/app/equi/${equiId}"]) button:has-text("Registrar entrada")`).first();
      if (await rowBtn.count()) {
        await rowBtn.click();
        await page.waitForTimeout(3000);
        ok = await assertResguardo();
      }
    }
    step("r1-02-entrada", ok, ok ? "" : "UI Sin entrada (técnica puede abrir si almacén registró en backend)");
    await page.close();
  }

  // 3 — Atención técnica (diagnóstico)
  {
    const page = await browser.newPage();
    await login(page, "tecnico.systron", DEMO_PW);
    let unblocked = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await page.goto(`${BASE}/app/tecnica/nueva?equiId=${equiId}`, { waitUntil: "domcontentloaded" });
      if ((await page.locator("text=aún no tiene entrada física").count()) === 0) {
        unblocked = true;
        break;
      }
      await page.waitForTimeout(1500);
    }
    if (!unblocked) {
      step("r1-03-atencion", false, "EQUI bloqueado sin entrada");
    } else {
      await page.waitForSelector('select[name="attentionType"]', { timeout: 30_000 });
      await page.selectOption('select[name="attentionType"]', "DIAGNOSTICO");
      await page.fill('textarea[name="reportedFault"]', "Recorrido E2E falla simulada");
      await page.getByRole("button", { name: "Crear" }).click();
      await page.waitForURL(/\/app\/tecnica\/[0-9a-f-]+/, { timeout: 45_000 });
      attUrl = page.url();
      step("r1-03-atencion", attUrl.includes("/app/tecnica/"));
      for (const label of ["Iniciar diagnóstico", "Marcar terminado"]) {
        const b = page.getByRole("button", { name: label });
        if (await b.count()) {
          await b.click();
          await page.waitForTimeout(2500);
          await page.reload({ waitUntil: "domcontentloaded" });
        }
      }
      const t = await page.locator("main").innerText();
      step("r1-04-diagnostico-cerrado", /Validar gerente|validación|PENDIENTE/i.test(t), t.slice(0, 60));
    }
    await page.close();
  }

  if (!attUrl) {
    writeFileSync("docs/E2E_RECORRIDO1_RUN.json", JSON.stringify({ log, equiId }, null, 2));
    await browser.close();
    process.exitCode = 2;
    return;
  }

  // 4 — Validación gerente → cotización
  {
    const page = await browser.newPage();
    let validated = false;
    for (const user of [
      { u: "ger.systron", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, user.u, user.p);
      await page.goto(attUrl, { waitUntil: "domcontentloaded" });
      for (let i = 0; i < 10; i++) {
        const val = page.getByRole("button", { name: "Validar gerente" });
        if (await val.count()) {
          await val.click();
          await page.waitForTimeout(3000);
          validated = true;
          break;
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);
      }
      if (validated) break;
    }
    step("r1-05-ger-valida", validated, validated ? "" : "sin botón validar");
    for (let i = 0; i < 15; i++) {
      await page.goto(attUrl, { waitUntil: "domcontentloaded" });
      let href = await page.locator('main a[href*="/app/cotizaciones/"]').first().getAttribute("href").catch(() => null);
      if (!href) {
        await page.goto(`${BASE}/app/cotizaciones/pendientes`, { waitUntil: "domcontentloaded" });
        href = await page.locator('main a[href*="/app/cotizaciones/"]').first().getAttribute("href").catch(() => null);
      }
      quoteId = href?.match(/\/app\/cotizaciones\/([0-9a-f-]+)/)?.[1] ?? null;
      if (quoteId) break;
      await page.waitForTimeout(1500);
    }
    step("r1-06-cot-generada", Boolean(quoteId), quoteId ?? "");
    await page.close();
  }

  if (!quoteId) {
    writeFileSync("docs/E2E_RECORRIDO1_RUN.json", JSON.stringify({ log, equiId, attUrl }, null, 2));
    await browser.close();
    process.exitCode = 2;
    return;
  }

  const quoteUrl = `${BASE}/app/cotizaciones/${quoteId}`;

  // 5 — CEO precio
  {
    const page = await browser.newPage();
    await login(page, "ceo", DEMO_PW);
    await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="priceMxn"]', "14500");
    await page.getByRole("button", { name: "Guardar precio" }).click();
    await page.waitForTimeout(2000);
    const t = await page.locator("main").innerText();
    step("r1-07-ceo-precio", !t.includes("Fijar precio") || t.includes("14,500") || t.includes("14500"), "");
    await page.close();
  }

  // 6 — Comercial: contacto + envío + decisión (ventas SYSTRON; Vectoria fallback)
  {
    const page = await browser.newPage();
    for (const cred of [
      { u: "ventas.systron", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const sendBtn0 = page.getByRole("button", { name: /Enviar cotización ahora/i });
      if (!(await sendBtn0.count())) {
        const contactForm = page
          .locator(`form:has(input[name="returnTo"][value="/app/cotizaciones/${quoteId}"])`)
          .filter({ hasText: "Crear contacto" });
        if (await contactForm.count()) {
          await contactForm.locator('input[name="name"]').fill("Contacto E2E R1");
          await contactForm.locator('input[name="email"]').fill("e2e-r1@example.com");
          await Promise.all([
            page.waitForURL(new RegExp(`/app/cotizaciones/${quoteId}`), { timeout: 45_000 }).catch(() => null),
            contactForm.getByRole("button", { name: "Guardar y volver" }).click(),
          ]);
          await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
        }
      }
      if (await page.getByRole("button", { name: /Enviar cotización ahora/i }).count()) break;
    }
    const sendBtn = page.getByRole("button", { name: /Enviar cotización ahora/i });
    if (await sendBtn.count()) {
      const cb = page.locator('input[name="contactIds"]').first();
      if (await cb.count()) await cb.check();
      const emailChk = page.locator('input[name="sendEmail"]').first();
      if (await emailChk.count()) await emailChk.check();
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
        sendBtn.click(),
      ]);
      await page.waitForTimeout(2000);
    }
    await page.goto(quoteUrl, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => page.goto(quoteUrl));
    let t = await page.locator("main").innerText();
    step(
      "r1-08-enviada",
      t.includes("Decisión del cliente") || t.includes("Documento enviado") || /ENVIADA/i.test(t),
      t.slice(0, 80),
    );
    const auth = page.getByRole("button", { name: "Cliente autoriza" });
    if (await auth.count()) {
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
        auth.click(),
      ]);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      t = await page.locator("main").innerText();
    }
    step("r1-09-decision", t.includes("AUTORIZADA") || t.includes("Documentos fiscales"), t.slice(0, 80));
    await page.close();
  }

  // 7 — Coordinación: factura
  {
    const page = await browser.newPage();
    await login(page, "coord", DEMO_PW);
    await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
    const gen = page.getByRole("button", { name: "Generar factura (coord.)" });
    if (await gen.count()) {
      await gen.click();
      await page.waitForURL(/\/app\/finanzas\/facturas\//, { timeout: 45_000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const ok = page.url().includes("/app/finanzas/facturas/") || (await page.locator("main").innerText()).includes("FAC-");
      step("r1-10-factura-coord", ok, page.url());
    } else {
      const t = await page.locator("main").innerText();
      step("r1-10-factura-coord", t.includes("FAC-") || t.includes("Facturas"), "sin botón generar");
    }
    await page.close();
  }

  await browser.close();
  const report = {
    base: BASE,
    equiId,
    quoteId,
    attUrl,
    log,
    passed: log.filter((x) => x.ok).length,
    failed: log.filter((x) => !x.ok).length,
  };
  writeFileSync("docs/E2E_RECORRIDO1_RUN.json", JSON.stringify(report, null, 2));
  console.log(`\n=== Recorrido 1: ${report.passed}/${log.length} OK ===`);
  if (report.failed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
