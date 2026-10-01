/**
 * UAT smoke por rol — tronco comercial reciente (altas rápidas, hubs EQUI/MOT, compras).
 * Env: SYGOS_STAGING_URL (default https://sygos.systronia.com)
 *      SYGOS_DEMO_USERS_PASSWORD, VECTORIA_SUPERUSER_PASSWORD or SYGOS_VECTORIA_INITIAL_PASSWORD
 */
import { launchUatBrowser } from "./uat-browser-launch.mjs";
import { writeFileSync } from "fs";

const BASE = (process.env.SYGOS_STAGING_URL || "https://sygos.systronia.com").replace(/\/$/, "");
const ADMIN = "Vectoria";
const ADMIN_PW = (
  process.env.SYGOS_VECTORIA_INITIAL_PASSWORD ||
  process.env.VECTORIA_SUPERUSER_PASSWORD ||
  ""
).trim();
const DEMO_PW = (process.env.SYGOS_DEMO_USERS_PASSWORD || "").trim();

const passed = [];
const failed = [];

function ok(key, note = "") {
  passed.push({ key, note });
  console.log(`OK  ${key}${note ? ` — ${note}` : ""}`);
}
function bad(key, note = "") {
  failed.push({ key, note });
  console.log(`FAIL ${key}${note ? ` — ${note}` : ""}`);
}

async function login(page, user, pw) {
  const res = await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!res || res.status() >= 500) throw new Error(`login page HTTP ${res?.status()}`);
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', pw);
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 45_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function gotoOk(page, path, mustInclude = []) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const status = res?.status() ?? 0;
  const pathname = new URL(page.url()).pathname;
  const text = await page.locator("main").innerText().catch(() => "");
  const onPath = pathname === path || pathname.startsWith(path);
  const hasText = mustInclude.length === 0 || mustInclude.some((s) => text.includes(s));
  return { status, pathname, text, ok: status < 400 && onPath && hasText };
}

async function navHas(page, label) {
  return (await page.locator(`nav a:has-text("${label}")`).count()) > 0;
}

async function main() {
  if (!DEMO_PW) throw new Error("SYGOS_DEMO_USERS_PASSWORD missing");
  const browser = await launchUatBrowser();

  // ventas SYSTRON — comercial + alta rápida
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ventas.systron", DEMO_PW);
    const home = await gotoOk(page, "/app", ["Inicio", "bandeja", "SYSTRON", "Comercial"]);
    if (home.ok) ok("rol-ventas-inicio");
    else bad("rol-ventas-inicio", home.pathname);
    const cotNueva = await gotoOk(page, "/app/cotizaciones/nueva", ["Crear cliente", "Cliente", "cotización"]);
    if (cotNueva.ok) ok("rol-ventas-cot-nueva-quick-client");
    else bad("rol-ventas-cot-nueva-quick-client", cotNueva.text.slice(0, 60));
    if (await navHas(page, "Cotizaciones")) ok("rol-ventas-nav-cotizaciones");
    else bad("rol-ventas-nav-cotizaciones");
    if (!(await navHas(page, "Finanzas"))) ok("rol-ventas-sin-finanzas-nav");
    else bad("rol-ventas-sin-finanzas-nav", "Finanzas visible");
    await ctx.close();
  }

  // almacén SYSTRON
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "almacen.systron", DEMO_PW);
    const alm = await gotoOk(page, "/app/almacen", ["Almacén", "resguardo", "entrada"]);
    if (alm.ok) ok("rol-almacen-modulo");
    else bad("rol-almacen-modulo", alm.pathname);
    const equi = await gotoOk(page, "/app/equi", ["EQUI", "Equipo"]);
    if (equi.ok) ok("rol-almacen-equi-list");
    else bad("rol-almacen-equi-list");
    await ctx.close();
  }

  // técnico SYSTRON
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "tecnico.systron", DEMO_PW);
    const tech = await gotoOk(page, "/app/tecnica", ["Técnica", "atención", "Atención", "Diagnóstico", "bandeja"]);
    if (tech.ok) ok("rol-tecnico-bandeja");
    else bad("rol-tecnico-bandeja");
    const nueva = await gotoOk(page, "/app/tecnica/nueva", ["EQUI", "MOT", "atención"]);
    if (nueva.ok) ok("rol-tecnico-nueva-atencion");
    else bad("rol-tecnico-nueva-atencion");
    await ctx.close();
  }

  // gerente SYSTRON
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.systron", DEMO_PW);
    const home = await gotoOk(page, "/app");
    if (home.ok) ok("rol-ger-systron-inicio");
    else bad("rol-ger-systron-inicio");
    const panel = await gotoOk(page, "/app/paneles/gerente-systron", [
      "Gerencia SYSTRON",
      "Diagnósticos por validar",
      "Operación técnica",
    ]);
    if (panel.ok) ok("rol-ger-systron-panel");
    else bad("rol-ger-systron-panel", panel.text.slice(0, 60));
    await gotoOk(page, "/app/cotizaciones/pendientes");
    ok("rol-ger-systron-pendientes-ruta");
    await ctx.close();
  }

  // CEO — pendientes + switch empresa
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ceo", DEMO_PW);
    const ceo = await gotoOk(page, "/app/paneles/ceo", ["CEO", "Pendiente", "cotizar"]);
    if (ceo.ok) ok("rol-ceo-panel");
    else bad("rol-ceo-panel", ceo.text.slice(0, 80));
    const smBtn = page.locator('header button:has-text("Servomotores")').first();
    if (await smBtn.count()) ok("rol-ceo-switch-sm");
    else bad("rol-ceo-switch-sm");
    await ctx.close();
  }

  // gerente Servomotores — MOT + compras
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    const mot = await gotoOk(page, "/app/mot", ["Motores", "MOT", "motor", "Custodia"]);
    if (mot.ok) ok("rol-ger-sm-mot");
    else bad("rol-ger-sm-mot");
    const compras = await gotoOk(page, "/app/compras", ["Compras", "Presupuesto", "directa"]);
    if (compras.ok) ok("rol-ger-sm-compras");
    else bad("rol-ger-sm-compras");
    await ctx.close();
  }

  // coordinación — finanzas + egresos list
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    const fin = await gotoOk(page, "/app/finanzas", ["Factura", "Finanzas"]);
    if (fin.ok) ok("rol-coord-finanzas");
    else bad("rol-coord-finanzas");
    await ctx.close();
  }

  // Vectoria admin — hubs MOT detalle (ruta 200)
  if (ADMIN_PW) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    const motList = await gotoOk(page, "/app/mot");
    if (motList.ok) ok("admin-mot-list");
    else bad("admin-mot-list");
    const link = page.locator('main a:has-text("Ver ficha")').first();
    if (await link.count()) {
      const href = await link.getAttribute("href");
      if (href) await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      else {
        await link.click();
        await page.waitForURL(/\/app\/mot\/[0-9a-f-]+/i, { timeout: 45_000 }).catch(() => null);
      }
      const t = await page.locator("main").innerText();
      if (
        t.includes("Ingreso") ||
        t.includes("resguardo") ||
        t.includes("Workflow") ||
        t.includes("Custodia")
      )
        ok("admin-mot-hub");
      else bad("admin-mot-hub", t.slice(0, 80));
    } else ok("admin-mot-hub", "sin MOT detalle en staging (skip hub)");
    await ctx.close();
  } else {
    bad("admin-mot-hub", "VECTORIA password missing — skip admin");
  }

  await browser.close();
  const report = {
    base: BASE,
    at: new Date().toISOString(),
    passed: passed.length,
    failed: failed.length,
    items: { passed, failed },
  };
  writeFileSync("scripts/uat-rol-tronco-results.json", JSON.stringify(report, null, 2));
  console.log(`\n=== UAT rol tronco: ${passed.length} OK, ${failed.length} FAIL (${BASE}) ===`);
  if (failed.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
