// Debug: reproduce "forms flash but don't open" in the Expo web preview.
// Logs in with a seeded account, clicks each form card, captures console
// errors, page errors and screenshots after each step.
import { chromium } from "/usr/local/lib/node_modules/playwright/index.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:8081";
const shots = ".rork/web-verification/form-debug";
const console_ = [];
const pageErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", async (m) => {
  const text = m.text();
  if (m.type() === "error" || /error|exception/i.test(text)) {
    const args = await Promise.all(m.args().map(async (a) => {
      try { return (await a.jsonValue()); } catch { return String(a); }
    }));
    console_.push(`[${m.type()}] ${text.slice(0, 300)} ${JSON.stringify(args).slice(0, 2000)}`);
  }
});
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 800)));

const snap = async (name) => page.screenshot({ path: `${shots}/${name}.png` });

await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
await snap("01-loaded");

// Sign in (seeded admin account) if the login screen is showing.
const emailField = page.locator('input[placeholder="Enter your email address"]');
if (await emailField.count()) {
  await emailField.fill("paul@btstech.co.za");
  await page.locator('input[placeholder="Enter your password"]').fill("Admin@2024");
  await page.getByText("Sign In", { exact: true }).first().click();
  await page.waitForTimeout(4000);
}
await snap("02-after-login");

for (const [label, name] of [["Patient registration with medical aid coverage", "medical-aid"], ["Compensation for Occupational Injuries", "coida"], ["View daily patient diary", "worklist"]]) {
  const before = page.url();
  const card = page.getByText(label, { exact: false }).first();
  if (!(await card.count())) { console.log(`MISSING CARD: ${label}`); continue; }
  await card.click({ force: true });
  await page.waitForTimeout(4000);
  const after = page.url();
  console.log(`CLICK ${name}: url ${before} -> ${after} ${after !== before ? "OK ✓" : "BOUNCED ✗"}`);
  await snap(`03-${name}-opened`);
  if (after !== before) {
    // Go back home before testing the next form.
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
  }
}

for (const route of ["/coida", "/medical-aid", "/worklist", "/forms"]) {
  const resp = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60000 }).catch((e) => { console.log(`GOTO ${route} failed: ${e.message.slice(0, 200)}`); return null; });
  await page.waitForTimeout(4000);
  const body = (await page.locator("body").innerText().catch(() => "<body read failed>")).replace(/\s+/g, " ").slice(0, 300);
  console.log(`ROUTE ${route}: status=${resp ? resp.status() : "n/a"} url=${page.url()}\n  body: ${body}`);
  await snap(`deep${route.replace(/\//g, "_")}`);
}

console.log("=== PAGE ERRORS ===");
for (const e of pageErrors) console.log(e);
console.log("=== CONSOLE (errors/warnings) ===");
for (const c of console_.slice(-30)) console.log(c);

await browser.close();
