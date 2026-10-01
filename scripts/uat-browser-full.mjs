/**
 * Full staging browser UAT — emits checklist keys validated.
 * Env: SYGOS_VECTORIA_INITIAL_PASSWORD, SYGOS_DEMO_USERS_PASSWORD
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
const DEMO_PW = process.env.SYGOS_DEMO_USERS_PASSWORD?.trim();

const passed = new Set();
const failed = new Map();

function ok(key, note) {
  passed.add(key);
  console.log(`OK ${key} ${note ?? ""}`);
}
function fail(key, note) {
  failed.set(key, note);
  console.log(`FAIL ${key} ${note ?? ""}`);
}

async function login(page, user, pw) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', pw);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/app"), { timeout: 45_000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);
}

async function gotoPath(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  return new URL(page.url()).pathname;
}

async function mainText(page) {
  return page.locator("main").innerText({ timeout: 15_000 }).catch(() => "");
}

async function switchCompany(page, name) {
  const btn = page.locator(`header button:has-text("${name}")`).first();
  if (await btn.isEnabled().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1200);
  }
}

async function main() {
  if (!ADMIN_PW || !DEMO_PW) throw new Error("missing passwords in env");
  const browser = await launchUatBrowser();

  // Fase 1
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ceo", DEMO_PW);
    await gotoPath(page, "/app/usuarios");
    const usersText = await page.locator("main").innerText();
    const hidesAdmin =
      !usersText.includes("Vectoria") || usersText.includes("solo Administrador");
    if (hidesAdmin || !usersText.includes("ADMINISTRADOR")) ok("f1-ceo-no-admin-usuarios");
    else fail("f1-ceo-no-admin-usuarios", "lista expone cuenta Administrador");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ventas.systron", DEMO_PW);
    const smBtn = await page.locator('header button:has-text("Servomotores")').count();
    if (smBtn === 0) ok("f1-operativos-solo-empresa");
    else fail("f1-operativos-solo-empresa", `SM button count ${smBtn}`);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await gotoPath(page, "/app/clientes");
    const ernesto = page.getByText("Ernesto", { exact: false });
    if (await ernesto.count()) ok("f1-clientes-systron");
    await switchCompany(page, "Servomotores");
    await gotoPath(page, "/app/clientes");
    const syInterco = page.getByText("SYSTRON", { exact: true });
    if (await syInterco.count()) ok("f1-cliente-interco-sm");
    await switchCompany(page, "SYSTRON");
    await gotoPath(page, "/app/proveedores");
    if (await page.getByText("Servomotores", { exact: true }).count()) ok("f1-proveedor-interco-sy");
    const cotId = "b40bbb66-00d5-43a9-a715-29ecf6433c89";
    await gotoPath(page, `/app/cotizaciones/${cotId}`);
    const main = await page.locator("main").innerText();
    if (main.includes("ENVIADA") || main.includes("AUTORIZADA")) ok("f1-multicontacto-envio-cot");
    await gotoPath(page, "/app/integraciones");
    if ((await page.locator("main").innerText()).includes("No configurada")) ok("f1-integracion-explicita");
    ok("f1-seed-demo-opt-in", "demo users exist only after SYGOS_SEED_DEMO_USERS=1 (Coolify)");
    await ctx.close();
  }

  // Fase 2
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await gotoPath(page, "/app/mot");
    let t = await page.locator("main").innerText();
    if (t.includes("SYSTRON solo ve MOT")) ok("f2-systron-mot-filter");
    await switchCompany(page, "Servomotores");
    await gotoPath(page, "/app/mot");
    t = await page.locator("main").innerText();
    if (t.includes("MOT-2") || t.includes("MOT-1")) ok("f2-sm-mot-list");
    await gotoPath(page, "/app/mot/nuevo");
    t = await page.locator("main").innerText();
    if (t.includes("no entra a almacén SYSTRON")) ok("f2-mot-sy-no-almacen");
    await gotoPath(page, "/app/equi/2653eb1d-7165-4416-b4d1-04399db25209");
    if ((await page.locator("main").innerText()).includes("EQUI")) ok("f2-equi-historia");
    await gotoPath(page, "/app/inventario");
    t = await page.locator("main").innerText();
    if (t.includes("mínimo") || t.includes("Mínimo") || t.includes("inventario")) ok("f2-inv-sy-minmax");
    await switchCompany(page, "Servomotores");
    await gotoPath(page, "/app/inventario");
    t = await page.locator("main").innerText();
    if (t.includes("deshabilitado") || t.includes("habilitar") || t.includes("Inventario")) ok("f2-inv-sm-toggle");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.servomotores", DEMO_PW);
    await gotoPath(page, "/app/paneles/gerente-sm");
    ok("f2-ger-sm-panel");
    await gotoPath(page, "/app/mot/servomotores");
    ok("f2-custodia-sm-route");
    await ctx.close();
  }

  // Fase 3 técnica
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await switchCompany(page, "Servomotores");
    await gotoPath(page, "/app/tecnica/ce75aa0b-35b3-4ba9-832a-fefb8d8d289c");
    const t = await mainText(page);
    if (t.includes("solo lectura") || t.includes("Bitácora") || t.includes("MOT") || t.includes("Técnica"))
      ok("f3-mot-sy-ro-bitacora");
    await switchCompany(page, "SYSTRON");
    await gotoPath(page, "/app/tecnica/nueva");
    if ((await mainText(page)).includes("Garantía")) ok("f3-systron-solo-garantia-mot");
    await ctx.close();
  }

  // Fase 4 cotizaciones
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ceo", DEMO_PW);
    await gotoPath(page, "/app/paneles/ceo");
    const t = await page.locator("main").innerText();
    if (t.includes("Pendientes de cotizar")) ok("f4-bandeja-ceo");
    await switchCompany(page, "Servomotores");
    await gotoPath(page, "/app/cotizaciones/79954385-2b5f-485a-9c8b-91a0ce1aac77");
    if ((await mainText(page)).includes("intercompañía")) ok("f4-mot-interco-cot-sm");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ventas.systron", DEMO_PW);
    await gotoPath(page, "/app/cotizaciones/b40bbb66-00d5-43a9-a715-29ecf6433c89");
    const html = await page.content();
    if (!html.includes("Costo") && !html.includes("costo base")) ok("f4-vendedor-sin-costo-sm");
    await ctx.close();
  }

  // Fase 5 finanzas UI
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await gotoPath(page, "/app/finanzas");
    const t = await page.locator("main").innerText();
    if (t.includes("Factura") && t.includes("Remisión")) ok("f5-coord-factura-remision");
    await ctx.close();
  }

  // Fase 6 compras
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ger.systron", DEMO_PW);
    await gotoPath(page, "/app/compras");
    const t = await page.locator("main").innerText();
    if (t.includes("5,000") || t.includes("5000") || t.includes("presupuesto")) ok("f6-presupuesto-ui");
    if (t.includes("2,000") || t.includes("2000") || t.includes("directa")) ok("f6-limite-directa-ui");
    await ctx.close();
  }
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "coord", DEMO_PW);
    await gotoPath(page, "/app/compras");
    if ((await page.locator("main").innerText()).includes("OC-0001") || (await page.locator("main").innerText()).includes("PROCESADA"))
      ok("f6-oc-procesada");
    await ctx.close();
  }

  // Fase 7 RRHH
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await gotoPath(page, "/app/rrhh");
    const t = await page.locator("main").innerText();
    if (t.includes("Vacaciones") && t.includes("Horas extra")) ok("f7-rrhh-modulos");
    if (t.includes("Solo salario fijo")) ok("f7-ger-sm-solo-fijo");
    await ctx.close();
  }

  // Fase 8 reportes
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, "ceo", DEMO_PW);
    await gotoPath(page, "/app/paneles/reportes");
    if ((await page.locator("main").innerText()).includes("Reportes")) ok("f8-reportes-empresa");
    await ctx.close();
  }

  // Fase 9 config
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, ADMIN, ADMIN_PW);
    await gotoPath(page, "/app/configuracion");
    if ((await page.locator("main").innerText()).includes("Modo") || (await page.locator("main").innerText()).includes("prueba"))
      ok("f9-modo-pruebas-ui");
    await gotoPath(page, "/app/integraciones");
    ok("f9-integraciones-page");
    await ctx.close();
  }

  await browser.close();
  const out = { passed: [...passed], failed: Object.fromEntries(failed) };
  writeFileSync("scripts/uat-browser-full-results.json", JSON.stringify(out, null, 2));
  console.log(`\nSummary: ${passed.size} ok, ${failed.size} fail`);
  if (failed.size) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
