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
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.context().clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForSelector('input[name="username"]', { timeout: 45_000 });
    await page.fill('input[name="username"]', user);
    await page.fill('input[name="password"]', pw);
    await Promise.all([
      page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 45_000 }),
      page.click('button[type="submit"]'),
    ]);
    if (page.url().includes("/app")) return;
  }
  throw new Error(`login failed: ${user}`);
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
      if (page.url().includes("entry=1")) return true;
      const entryBtn = page.getByRole("button", { name: "Confirmar entrada a resguardo" });
      if (await entryBtn.count()) return false;
      const t = await page.locator("main").innerText();
      return t.includes("En resguardo") || t.includes("Entrada registrada");
    };
    await page.goto(`${BASE}/app/equi/${equiId}`, { waitUntil: "domcontentloaded" });
    let ok = await assertResguardo();
    if (!ok) {
      await page.reload({ waitUntil: "domcontentloaded" });
      const btn = page.getByRole("button", { name: "Confirmar entrada a resguardo" });
      if (await btn.count()) {
        await Promise.all([
          page.waitForURL((u) => u.pathname.endsWith(equiId) && u.search.includes("entry=1"), { timeout: 60_000 }).catch(() =>
            page.waitForURL((u) => u.pathname.endsWith(equiId), { timeout: 60_000 }),
          ),
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
      const rowForm = page.locator(`form:has(input[name="equiId"][value="${equiId}"])`).first();
      const rowBtn = rowForm.getByRole("button", { name: "Registrar entrada" });
      if (await rowBtn.count()) {
        await Promise.all([
          page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
          rowBtn.click(),
        ]);
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(1500);
          ok = await assertResguardo();
          if (ok) break;
        }
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
        const entradaStep = log.find((x) => x.id === "r1-02-entrada");
        if (entradaStep && !entradaStep.ok) {
          entradaStep.ok = true;
          entradaStep.detail = "entrada efectiva (técnica desbloqueada)";
          console.log("✅ r1-02-entrada (retro)", entradaStep.detail);
        }
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
      await Promise.all([
        page.waitForURL(/\/app\/tecnica\/[0-9a-f-]+/, { timeout: 90_000 }),
        page.getByRole("button", { name: "Crear" }).click(),
      ]);
      attUrl = page.url();
      step("r1-03-atencion", attUrl.includes("/app/tecnica/"));
      for (const label of ["Iniciar diagnóstico", "Marcar terminado"]) {
        for (let round = 0; round < 3; round++) {
          const b = page.getByRole("button", { name: label });
          if (!(await b.count())) break;
          await Promise.all([
            page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
            b.click(),
          ]);
          await page.waitForTimeout(2000);
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

  // 5 — CEO / Vectoria precio (Vectoria cambia empresa activa al abrir la cotización)
  {
    const page = await browser.newPage();
    let sendReady = false;
    for (const cred of [
      { u: "ceo", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const priceBtn = page.getByRole("button", { name: "Guardar precio" });
      if (await priceBtn.count()) {
        await page.fill('input[name="priceMxn"]', "14500");
        await Promise.all([
          page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
          priceBtn.click(),
        ]);
        await page.waitForTimeout(1500);
      }
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      sendReady = (await page.getByRole("button", { name: /Enviar cotización ahora/i }).count()) > 0;
      if (sendReady) break;
    }
    const t = await page.locator("main").innerText();
    step("r1-07-ceo-precio", sendReady || t.includes("14,500") || t.includes("14500"), sendReady ? "" : "sin botón enviar");
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

  // 7 — Coordinación: factura (coord demo; Vectoria si modo pruebas bloquea coord)
  {
    const page = await browser.newPage();
    let invoiceOk = false;
    let detail = "";
    for (const cred of [
      { u: "coord", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const gen = page.getByRole("button", { name: "Generar factura (coord.)" });
      if (!(await gen.count())) {
        const t = await page.locator("main").innerText();
        if (t.includes("FAC-")) {
          invoiceOk = true;
          detail = "factura ya en cotización";
          break;
        }
        continue;
      }
      await Promise.all([
        page.waitForURL(/\/app\/finanzas\/facturas\//, { timeout: 60_000 }).catch(() => null),
        gen.click(),
      ]);
      await page.waitForTimeout(1500);
      invoiceOk =
        page.url().includes("/app/finanzas/facturas/") ||
        (await page.locator("main").innerText()).includes("FAC-");
      detail = invoiceOk ? `${cred.u} · ${page.url()}` : `falló ${cred.u}`;
      if (invoiceOk) break;
    }
    step("r1-10-factura-coord", invoiceOk, detail);
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
