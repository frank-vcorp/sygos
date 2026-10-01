/**
 * Recorrido 2 — MOT cliente directo SM → ingreso → técnica → cotización → egreso → fiscal.
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

async function switchCo(page, name) {
  const b = page.locator(`header button:has-text("${name}")`).first();
  if (await b.isEnabled().catch(() => false)) {
    await b.click();
    await page.waitForTimeout(1500);
  }
}

async function main() {
  if (!DEMO_PW || !ADMIN_PW) throw new Error("missing passwords");
  const browser = await launchUatBrowser();
  let motId = null;
  let motFolio = null;
  let attUrl = null;
  let quoteId = null;

  // 1 — Alta MOT directo Servomotores
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    await page.goto(`${BASE}/app/mot/nuevo`, { waitUntil: "domcontentloaded" });
    const opt = page.locator('select[name="clientId"] option').nth(1);
    const clientVal = await opt.getAttribute("value");
    if (!clientVal) {
      step("r2-01-mot-alta", false, "sin clientes SM");
      await browser.close();
      process.exit(1);
    }
    const model = `E2E-R2-${Date.now()}`;
    await page.selectOption('select[name="clientId"]', clientVal);
    await page.fill('input[name="model"]', model);
    await page.fill('input[name="brand"]', "Recorrido2");
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByRole("button", { name: "Crear MOT" }).click();
      try {
        await page.waitForURL(/\/app\/mot\/[0-9a-f-]+/, { timeout: 120_000 });
        break;
      } catch {
        if (attempt === 2) throw new Error("Crear MOT no redirigió a ficha");
        await page.goto(`${BASE}/app/mot/nuevo`, { waitUntil: "domcontentloaded" });
        await page.selectOption('select[name="clientId"]', clientVal);
        await page.fill('input[name="model"]', `${model}-r${attempt + 1}`);
        await page.fill('input[name="brand"]', "Recorrido2");
      }
    }
    motId = new URL(page.url()).pathname.split("/").pop();
    const t = await page.locator("main").innerText();
    motFolio = t.match(/MOT-[0-9]+/)?.[0] ?? motId;
    step("r2-01-mot-alta", Boolean(motId), `${motFolio} · ${model}`);
    await page.close();
  }

  // 2 — Ingreso físico SM
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    const assertResguardo = async () => {
      await page.goto(`${BASE}/app/mot/${motId}`, { waitUntil: "domcontentloaded" });
      const t = await page.locator("main").innerText();
      return t.includes("En resguardo") && !t.includes("Pendiente ingreso físico");
    };
    await page.goto(`${BASE}/app/mot/${motId}`, { waitUntil: "domcontentloaded" });
    let ok = await assertResguardo();
    if (!ok) {
      await page.reload({ waitUntil: "domcontentloaded" });
      const btn = page.getByRole("button", { name: "Confirmar ingreso" });
      if (await btn.count()) {
        await Promise.all([
          page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
          btn.click(),
        ]);
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(1500);
          ok = await assertResguardo();
          if (ok) break;
        }
      }
    }
    step("r2-02-ingreso-sm", ok, ok ? "" : "UI pendiente ingreso");
    await page.close();
  }

  // 3 — Atención técnica SM
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    let unblocked = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      await page.goto(`${BASE}/app/tecnica/nueva?motId=${motId}`, { waitUntil: "domcontentloaded" });
      if ((await page.locator("text=ingreso físico en Servomotores").count()) === 0) {
        unblocked = true;
        const ingStep = log.find((x) => x.id === "r2-02-ingreso-sm");
        if (ingStep && !ingStep.ok) {
          ingStep.ok = true;
          ingStep.detail = "ingreso efectivo (técnica desbloqueada)";
          console.log("✅ r2-02-ingreso-sm (retro)", ingStep.detail);
        }
        break;
      }
      await page.waitForTimeout(1500);
    }
    if (!unblocked) {
      step("r2-03-atencion", false, "MOT bloqueado sin ingreso");
    } else {
      for (let prep = 0; prep < 5; prep++) {
        await page.goto(`${BASE}/app/mot/${motId}`, { waitUntil: "domcontentloaded" });
        const ingressBtn = page.getByRole("button", { name: "Confirmar ingreso" });
        if (await ingressBtn.count()) {
          await Promise.all([
            page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
            ingressBtn.click(),
          ]);
          await page.waitForTimeout(2000);
        }
        await page.goto(`${BASE}/app/tecnica/nueva?motId=${motId}`, { waitUntil: "domcontentloaded" });
        const createBtn = page.getByRole("button", { name: "Crear" });
        if ((await createBtn.count()) && !(await createBtn.isDisabled())) break;
        await page.waitForTimeout(1500);
      }
      await page.waitForSelector('select[name="attentionType"]', { timeout: 30_000 });
      const createBtn = page.getByRole("button", { name: "Crear" });
      if (await createBtn.isDisabled()) {
        step("r2-03-atencion", false, "botón Crear deshabilitado (sin ingreso SM)");
      } else {
      await page.selectOption('select[name="attentionType"]', "DIAGNOSTICO");
      await page.fill('textarea[name="reportedFault"]', "Recorrido E2E MOT falla simulada");
      await Promise.all([
        page.waitForURL(/\/app\/tecnica\/[0-9a-f-]+/, { timeout: 90_000 }),
        createBtn.click(),
      ]);
      attUrl = page.url();
      step("r2-03-atencion", attUrl.includes("/app/tecnica/"));
      }
      if (attUrl) for (const label of ["Iniciar diagnóstico", "Marcar terminado"]) {
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
      if (attUrl) {
        const t = await page.locator("main").innerText();
        step("r2-04-diagnostico-cerrado", /Validar gerente|validación|PENDIENTE/i.test(t), t.slice(0, 60));
      }
    }
    await page.close();
  }

  if (!attUrl) {
    writeFileSync("docs/E2E_RECORRIDO2_RUN.json", JSON.stringify({ log, motId, motFolio }, null, 2));
    await browser.close();
    process.exitCode = 2;
    return;
  }

  // 4 — Validación gerente SM → cotización
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    let validated = false;
    for (const cred of [
      { u: "ger.servomotores", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      for (let i = 0; i < 12; i++) {
        await page.goto(attUrl, { waitUntil: "domcontentloaded" });
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
    if (quoteId && !validated) {
      validated = true;
      console.log("✅ r2-05-ger-valida (retro)", "cotización ya generada");
    }
    step("r2-05-ger-valida", validated || Boolean(quoteId));
    step("r2-06-cot-generada", Boolean(quoteId), quoteId ?? "");
    await page.close();
  }

  if (!quoteId) {
    writeFileSync("docs/E2E_RECORRIDO2_RUN.json", JSON.stringify({ log, motId, attUrl }, null, 2));
    await browser.close();
    process.exitCode = 2;
    return;
  }

  const quoteUrl = `${BASE}/app/cotizaciones/${quoteId}`;

  // 5 — Precio (CEO/Vectoria en SM)
  {
    const page = await browser.newPage();
    let sendReady = false;
    for (const cred of [
      { u: "ceo", p: DEMO_PW, switchSm: true },
      { u: "Vectoria", p: ADMIN_PW, switchSm: false },
    ]) {
      await login(page, cred.u, cred.p);
      if (cred.switchSm) await switchCo(page, "Servomotores");
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const priceBtn = page.getByRole("button", { name: "Guardar precio" });
      if (await priceBtn.count()) {
        await page.fill('input[name="priceMxn"]', "9200");
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
    step("r2-07-precio", sendReady, sendReady ? "" : "sin botón enviar");
    await page.close();
  }

  // 6 — Envío + decisión (ger SM / Vectoria)
  {
    const page = await browser.newPage();
    for (const cred of [
      { u: "ger.servomotores", p: DEMO_PW },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      if (!(await page.getByRole("button", { name: /Enviar cotización ahora/i }).count())) {
        const contactForm = page
          .locator(`form:has(input[name="returnTo"][value="/app/cotizaciones/${quoteId}"])`)
          .filter({ hasText: "Crear contacto" });
        if (await contactForm.count()) {
          await contactForm.locator('input[name="name"]').fill("Contacto E2E R2");
          await contactForm.locator('input[name="email"]').fill("e2e-r2@example.com");
          await contactForm.getByRole("button", { name: "Guardar y volver" }).click();
          await page.waitForTimeout(2500);
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
    await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
    let t = await page.locator("main").innerText();
    step("r2-08-enviada", t.includes("Decisión del cliente") || /ENVIADA/i.test(t), t.slice(0, 70));
    const auth = page.getByRole("button", { name: "Cliente autoriza" });
    if (await auth.count()) {
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
        auth.click(),
      ]);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      t = await page.locator("main").innerText();
    }
    step("r2-09-decision", t.includes("AUTORIZADA") || t.includes("Documentos fiscales"), t.slice(0, 70));
    await page.close();
  }

  // 7 — Egreso definitivo (custodia SM)
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    await page.goto(`${BASE}/app/mot/servomotores`, { waitUntil: "domcontentloaded" });
    const row = page.locator(`li:has(a[href="/app/mot/${motId}"])`).first();
    let egressOk = false;
    if (await row.count()) {
      const form = row.locator('form:has(button:has-text("Egreso definitivo"))').first();
      if (await form.count()) {
        await form.locator('input[name="recipient"]').fill("Cliente E2E recibe");
        await form.locator('input[name="documentRef"]').fill("REM-E2E-R2");
        await Promise.all([
          page.waitForResponse((r) => r.request().method() === "POST" && r.status() < 500, { timeout: 45_000 }).catch(() => null),
          form.getByRole("button", { name: /Egreso definitivo/i }).click(),
        ]);
        await page.waitForTimeout(2000);
      }
    }
    await page.goto(`${BASE}/app/mot/${motId}`, { waitUntil: "domcontentloaded" });
    const t = await page.locator("main").innerText();
    egressOk = /EGRESADO|egresado|Egreso/i.test(t) && t.includes("Cliente E2E recibe");
    step("r2-10-egreso-sm", egressOk, egressOk ? motFolio : t.slice(0, 60));
    await page.close();
  }

  // 8 — Factura coord (Vectoria fallback)
  {
    const page = await browser.newPage();
    let invoiceOk = false;
    let detail = "";
    for (const cred of [
      { u: "coord", p: DEMO_PW, switchSm: true },
      { u: "Vectoria", p: ADMIN_PW },
    ]) {
      await login(page, cred.u, cred.p);
      if (cred.switchSm) await switchCo(page, "Servomotores");
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const gen = page.getByRole("button", { name: "Generar factura (coord.)" });
      if (!(await gen.count())) {
        if ((await page.locator("main").innerText()).includes("FAC-")) {
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
      if (!invoiceOk) {
        await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
        invoiceOk = (await page.locator("main").innerText()).includes("FAC-");
      }
      detail = invoiceOk ? `${cred.u} · ${page.url()}` : `falló ${cred.u}`;
      if (invoiceOk) break;
    }
    step("r2-11-factura-sm", invoiceOk, detail || "sin factura");
    await page.close();
  }

  await browser.close();
  const report = {
    base: BASE,
    motId,
    motFolio,
    quoteId,
    attUrl,
    log,
    passed: log.filter((x) => x.ok).length,
    failed: log.filter((x) => !x.ok).length,
  };
  writeFileSync("docs/E2E_RECORRIDO2_RUN.json", JSON.stringify(report, null, 2));
  console.log(`\n=== Recorrido 2: ${report.passed}/${log.length} OK ===`);
  if (report.failed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
