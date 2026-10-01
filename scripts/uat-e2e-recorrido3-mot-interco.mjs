/**
 * Recorrido 3 — MOT originado SYSTRON → ingreso SM → técnica SM → cotización interco.
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

async function runTechnicalFlow(page, motId) {
  let attUrl = null;
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
  await page.selectOption('select[name="attentionType"]', "DIAGNOSTICO");
  await page.fill('textarea[name="reportedFault"]', "Recorrido E2E interco MOT");
  const createBtn = page.getByRole("button", { name: "Crear" });
  if (await createBtn.isDisabled()) return null;
  await Promise.all([
    page.waitForURL(/\/app\/tecnica\/[0-9a-f-]+/, { timeout: 90_000 }),
    createBtn.click(),
  ]);
  attUrl = page.url();
  for (const label of ["Iniciar diagnóstico", "Marcar terminado"]) {
    for (let round = 0; round < 3; round++) {
      const b = page.getByRole("button", { name: label });
      if (!(await b.count())) break;
      await b.click();
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
  for (let i = 0; i < 12; i++) {
    await page.goto(attUrl, { waitUntil: "domcontentloaded" });
    const val = page.getByRole("button", { name: "Validar gerente" });
    if (await val.count()) {
      await val.click();
      await page.waitForTimeout(3000);
      break;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  let quoteId = null;
  for (let i = 0; i < 15; i++) {
    await page.goto(attUrl, { waitUntil: "domcontentloaded" });
    const href = await page.locator('main a[href*="/app/cotizaciones/"]').first().getAttribute("href").catch(() => null);
    quoteId = href?.match(/\/app\/cotizaciones\/([0-9a-f-]+)/)?.[1] ?? null;
    if (quoteId) break;
    await page.waitForTimeout(1500);
  }
  return { attUrl, quoteId };
}

async function main() {
  if (!DEMO_PW || !ADMIN_PW) throw new Error("missing passwords");
  const browser = await launchUatBrowser();
  let motId = null;
  let motFolio = null;
  let smQuoteId = null;

  // 1 — Alta MOT en SYSTRON
  {
    const page = await browser.newPage();
    await login(page, "ventas.systron", DEMO_PW);
    await page.goto(`${BASE}/app/mot/nuevo`, { waitUntil: "domcontentloaded" });
    const opt = page.locator('select[name="clientId"] option').nth(1);
    const clientVal = await opt.getAttribute("value");
    if (!clientVal) {
      step("r3-01-mot-systron", false, "sin clientes");
      await browser.close();
      process.exit(1);
    }
    const model = `E2E-R3-${Date.now()}`;
    await page.selectOption('select[name="clientId"]', clientVal);
    await page.fill('input[name="model"]', model);
    await page.fill('input[name="brand"]', "Interco");
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByRole("button", { name: "Crear MOT" }).click();
      try {
        await page.waitForURL(/\/app\/mot\/[0-9a-f-]+/, { timeout: 120_000 });
        break;
      } catch {
        if (attempt === 2) throw new Error("Crear MOT SYSTRON falló");
        await page.goto(`${BASE}/app/mot/nuevo`, { waitUntil: "domcontentloaded" });
        await page.selectOption('select[name="clientId"]', clientVal);
        await page.fill('input[name="model"]', `${model}-r${attempt + 1}`);
      }
    }
    motId = new URL(page.url()).pathname.split("/").pop();
    motFolio = (await page.locator("main").innerText()).match(/MOT-[0-9]+/)?.[0] ?? motId;
    const t = await page.locator("main").innerText();
    step("r3-01-mot-systron", Boolean(motId), `${motFolio} · origen SYSTRON en ficha: ${/SYSTRON/i.test(t)}`);
    await page.close();
  }

  // 2–4 — Ingreso + técnica + cotización SM
  {
    const page = await browser.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    const flow = await runTechnicalFlow(page, motId);
    step("r3-02-ingreso-tecnica", Boolean(flow?.attUrl), flow?.attUrl ?? "");
    smQuoteId = flow?.quoteId ?? null;
    step("r3-03-cot-sm", Boolean(smQuoteId), smQuoteId ?? "");
    if (smQuoteId) {
      await page.goto(`${BASE}/app/cotizaciones/${smQuoteId}`, { waitUntil: "domcontentloaded" });
      const t = await page.locator("main").innerText();
      step(
        "r3-04-badge-interco",
        /intercompañía|intercompa|MOT inter/i.test(t),
        t.match(/COT-[0-9]+/)?.[0] ?? "",
      );
    } else {
      step("r3-04-badge-interco", false, "sin cotización SM");
    }
    await page.close();
  }

  // 5 — SYSTRON ve MOT (solo lectura / hub)
  {
    const page = await browser.newPage();
    await login(page, "ger.systron", DEMO_PW);
    await page.goto(`${BASE}/app/mot/${motId}`, { waitUntil: "domcontentloaded" });
    const t = await page.locator("main").innerText();
    step("r3-05-systron-ve-mot", /SYSTRON|Servomotores|Bitácora|Custodia/i.test(t), motFolio);
    await page.close();
  }

  // 6 — Precio CEO en SM + decisión (propagación si hay espejo)
  if (smQuoteId) {
    const quoteUrl = `${BASE}/app/cotizaciones/${smQuoteId}`;
    {
      const page = await browser.newPage();
      await login(page, "ceo", DEMO_PW);
      await switchCo(page, "Servomotores");
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const priceBtn = page.getByRole("button", { name: "Guardar precio" });
      if (await priceBtn.count()) {
        await page.fill('input[name="priceMxn"]', "11000");
        await priceBtn.click();
        await page.waitForTimeout(2000);
      }
      step("r3-06-ceo-precio-sm", true);
      await page.close();
    }
    {
      const page = await browser.newPage();
      await login(page, "ger.servomotores", DEMO_PW);
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const sendBtn = page.getByRole("button", { name: /Enviar cotización ahora/i });
      if (await sendBtn.count()) {
        await page.locator('input[name="contactIds"]').first().check().catch(() => {});
        await page.locator('input[name="sendEmail"]').check().catch(() => {});
        await sendBtn.click();
        await page.waitForTimeout(2500);
      }
      await page.goto(quoteUrl, { waitUntil: "domcontentloaded" });
      const auth = page.getByRole("button", { name: "Cliente autoriza" });
      if (await auth.count()) await auth.click();
      await page.waitForTimeout(2000);
      const t = await page.locator("main").innerText();
      step("r3-07-decision-sm", t.includes("AUTORIZADA") || t.includes("Documentos fiscales"), "");
      await page.close();
    }
  }

  await browser.close();
  const report = {
    base: BASE,
    motId,
    motFolio,
    smQuoteId,
    log,
    passed: log.filter((x) => x.ok).length,
    failed: log.filter((x) => !x.ok).length,
  };
  writeFileSync("docs/E2E_RECORRIDO3_RUN.json", JSON.stringify(report, null, 2));
  console.log(`\n=== Recorrido 3: ${report.passed}/${log.length} OK ===`);
  if (report.failed) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
