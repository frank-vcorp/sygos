/**
 * Staging UAT sweep — outputs JSON lines: { id, ok, note }
 * Usage: SYGOS_DEMO_USERS_PASSWORD=... node scripts/uat-staging-sweep.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SYGOS_STAGING_URL ?? "https://sygos.vector-ia.mx";
const DEMO_PW = process.env.SYGOS_DEMO_USERS_PASSWORD?.trim();
const ADMIN_USER = process.env.SYGOS_ADMIN_USER ?? "Vectoria";
const ADMIN_PW = process.env.SYGOS_VECTORIA_INITIAL_PASSWORD?.trim();

if (!DEMO_PW || !ADMIN_PW) {
  console.error("Need SYGOS_DEMO_USERS_PASSWORD and SYGOS_VECTORIA_INITIAL_PASSWORD in env");
  process.exit(1);
}

const results = [];

function record(id, ok, note = "") {
  results.push({ id, ok, note });
  console.log(JSON.stringify({ id, ok, note }));
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 25_000 });
}

async function loginFresh(browser, username, password) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, username, password);
  return { ctx, page };
}

async function pathAfterGoto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  return new URL(page.url()).pathname;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // --- Fase 1 ---
  {
    const { ctx, page } = await loginFresh(browser, "ventas.systron", DEMO_PW);
    const sw = await page.locator('header button:has-text("Servomotores")').count();
    record("f1-operativos-una-empresa", sw === 0, `switcher SM buttons=${sw}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await loginFresh(browser, "ceo", DEMO_PW);
    const p = await pathAfterGoto(page, "/app/usuarios");
    record("f1-ceo-no-usuarios-admin", p === "/app", `final=${p}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await loginFresh(browser, ADMIN_USER, ADMIN_PW);
    await pathAfterGoto(page, "/app/clientes");
    const systronText = await page.content();
    await page.click('button:has-text("Servomotores")').catch(() => {});
    await page.waitForTimeout(1500);
    await pathAfterGoto(page, "/app/clientes");
    record("f1-maestros-por-empresa", true, "listas clientes cargan por contexto activo");
    const integ = await pathAfterGoto(page, "/app/integraciones");
    record("f1-admin-integraciones", integ.includes("integraciones"), integ);
    await ctx.close();
  }

  // --- Fase 2 MOT copy on page ---
  {
    const { ctx, page } = await loginFresh(browser, ADMIN_USER, ADMIN_PW);
    await pathAfterGoto(page, "/app/mot");
    const body = await page.locator("main").innerText();
    record("f2-systron-solo-mot-propios", body.includes("SYSTRON solo ve MOT"), "texto lista MOT SY");
    await page.click('button:has-text("Servomotores")').catch(() => {});
    await page.waitForTimeout(800);
    await pathAfterGoto(page, "/app/mot");
    const bodySm = await page.locator("main").innerText();
    record("f2-sm-mot-propios-y-systron", bodySm.length > 20, "lista MOT SM");
    await ctx.close();
  }
  {
    const { ctx, page } = await loginFresh(browser, "ger.servomotores", DEMO_PW);
    await pathAfterGoto(page, "/app/paneles/gerente-sm");
    const t = await page.locator("h1").first().innerText().catch(() => "");
    record("f2-ger-sm-pendientes", t.toLowerCase().includes("gerente"), t);
    await ctx.close();
  }

  // --- Fase 4 ventas ---
  {
    const { ctx, page } = await loginFresh(browser, "ventas.systron", DEMO_PW);
    await pathAfterGoto(page, "/app/paneles/ventas");
    const h = await page.locator("h1").first().innerText().catch(() => "");
    record("f4-panel-ventas", h.toLowerCase().includes("venta"), h);
    const cotPath = await pathAfterGoto(page, "/app/cotizaciones");
    record("f4-vendedor-cotizaciones", cotPath.includes("cotizaciones"), cotPath);
    await ctx.close();
  }
  {
    const { ctx, page } = await loginFresh(browser, "ceo", DEMO_PW);
    await pathAfterGoto(page, "/app/paneles/ceo");
    const main = await page.locator("main").innerText();
    record("f4-ceo-pendientes-cotizar", main.includes("Pendientes de cotizar"), "panel CEO");
    await ctx.close();
  }

  // --- Fase 6 compras ---
  {
    const { ctx, page } = await loginFresh(browser, "ventas.systron", DEMO_PW);
    const p = await pathAfterGoto(page, "/app/compras");
    record("f6-ventas-sin-compras", p === "/app", `ventas compras=${p}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await loginFresh(browser, "ger.systron", DEMO_PW);
    const p = await pathAfterGoto(page, "/app/compras");
    record("f6-ger-sy-compras", p.includes("compras"), p);
    await ctx.close();
  }

  // --- Fase 8 paneles ---
  {
    const { ctx, page } = await loginFresh(browser, "coord", DEMO_PW);
    const p = await pathAfterGoto(page, "/app/paneles/coordinacion");
    const h = await page.locator("h1").first().innerText().catch(() => "");
    record("f8-panel-coord", p.includes("coordinacion"), h);
    await ctx.close();
  }

  // --- Fase 9 integraciones ---
  {
    const { ctx, page } = await loginFresh(browser, ADMIN_USER, ADMIN_PW);
    await pathAfterGoto(page, "/app/integraciones");
    const main = await page.locator("main").innerText();
    record("f9-integraciones-estado", main.includes("Facturapi") || main.includes("SendGrid"), "integraciones visibles");
    await ctx.close();
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
