/**
 * End-to-end smoke test against a running dev server that uses a throwaway test database.
 *   DATABASE_PATH=./data/test.db npm run db:seed
 *   DATABASE_PATH=./data/test.db UPLOAD_DIR=./data/test-uploads npx next dev --port 3100
 *   node --env-file=.env.local --import tsx scripts/e2e-smoke.ts [screenshotDir]
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const OUT = path.resolve(process.argv[2] ?? "./data/e2e-shots");
fs.mkdirSync(OUT, { recursive: true });
const failures: string[] = [];
const check = (cond: unknown, msg: string) => {
  if (!cond) {
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  } else console.log(`  ✓ ${msg}`);
};

function watch(page: Page, label: string) {
  page.on("pageerror", (e) => failures.push(`[${label}] page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools|net::ERR_ABORTED|status of 404|caret-color/.test(m.text())) failures.push(`[${label}] console error (${page.url()}): ${m.text().slice(0, m.text().includes("hydrated") ? 2500 : 300)}`);
  });
}

async function noOverflow(page: Page, label: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(over <= 1, `${label}: no horizontal overflow (${over}px)`);
}

async function login(ctx: BrowserContext, name: string, password: string) {
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(`${BASE}/`);
  check(page.url().endsWith("/login"), `${name}: unauthenticated visit redirects to /login`);
  await page.fill("#username", name);
  await page.fill("#password", "wrong-password");
  await page.click("button[type=submit]");
  const err = page.getByRole("alert").filter({ hasText: "don't match" });
  await err.waitFor();
  check(await err.isVisible(), `${name}: wrong password shows an error`);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname !== "/login", null, { timeout: 30000 });
  return page;
}

async function onboard(page: Page, name: string, weekday: string, weekend: string) {
  if (!page.url().includes("/welcome")) await page.goto(`${BASE}/welcome`);
  check(page.url().includes("/welcome"), `${name}: first login goes to onboarding`);
  await page.fill('input[name="hoursWeekday"]', weekday);
  await page.fill('input[name="hoursWeekend"]', weekend);
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname === "/", null, { timeout: 60000 });
  await page.getByText("days until December 31").waitFor();
  check(await page.getByText("days until December 31").isVisible(), `${name}: dashboard shows the countdown`);
}

async function visitAll(page: Page, name: string, shots: boolean) {
  const routes = ["/", "/today", "/roadmap", "/calendar", "/calendar?view=month", "/projects", "/proof", "/resources", "/progress", "/settings"];
  for (const r of routes) {
    const res = await page.goto(`${BASE}${r}`);
    check(res?.status() === 200, `${name}: ${r} loads (${res?.status()})`);
    if (shots) await page.screenshot({ path: path.join(OUT, `${name.split(" ")[0].toLowerCase()}-${r.replace(/[/?=]/g, "_") || "home"}.png`), fullPage: true });
  }
}

async function main() {
  const browser = await chromium.launch();
  const adiPass = process.env.SEED_PASSWORD_ADITYA!;
  const harshPass = process.env.SEED_PASSWORD_HARSH!;

  // ── Aditya, desktop ──────────────────────────────────────────────
  console.log("Aditya (desktop)");
  const adi = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await login(adi, "Aditya Sharma", adiPass);
  await onboard(page, "Aditya", "3", "5");
  await visitAll(page, "Aditya Sharma", true);

  // Isolation: designer content must not be reachable.
  const res = await page.goto(`${BASE}/roadmap/pd-t1-1-1`);
  check(res?.status() === 404, `Aditya cannot open a designer topic (status ${res?.status()})`);

  // Topic workflow
  await page.goto(`${BASE}/roadmap/fe-t1-1-1`);
  await page.getByRole("button", { name: "Start learning" }).click();
  await page.getByRole("button", { name: "Mark as completed" }).waitFor();
  check(true, "Start learning moves topic to Learning");
  const firstBox = page.locator('#concepts input[type="checkbox"]').first();
  await firstBox.check({ force: true });
  await page.waitForTimeout(800);
  await page.fill("#notes-fe-t1-1-1", "CPU, RAM, storage and GPU — the memory hierarchy explains caching.");
  await page.getByRole("button", { name: "Save notes" }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  check(true, "Notes save");
  await page.locator("aside").getByLabel("Minutes").fill("35");
  await page.locator("aside").getByRole("button", { name: "Log time" }).click();
  await page.getByText("Logged 35 minutes").waitFor();
  check(true, "Time logged on topic");
  await page.getByRole("button", { name: "Mark as completed" }).click();
  await page.getByRole("link", { name: "Assess mastery" }).waitFor();
  check(true, "Topic marked completed");
  // Proof of work
  await page.locator("#proof summary").click();
  await page.locator('#proof input[name="title"]').fill("Hardware notes repo");
  await page.locator('#proof input[name="url"]').fill("https://github.com/example/hardware-notes");
  await page.locator('#proof textarea[name="description"]').fill("Notes and diagrams of the memory hierarchy.");
  await page.locator("#proof").getByRole("button", { name: "Save proof of work" }).click();
  await page.getByText("Proof of work saved").waitFor();
  check(true, "Proof of work saved");
  // Mastery
  for (const label of ["Explain the concept", "Implement independently", "Debug problems", "Explain architectural decisions", "Apply it in a real project"])
    await page.getByRole("group", { name: label }).getByText("Independently", { exact: true }).click();
  await page.locator("#mastery textarea").fill("A computer moves data through registers, caches, RAM and disk; each level is slower but larger, so locality and caching dominate performance everywhere.");
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await page.getByText("Mastery recorded").waitFor();
  check(true, "Mastery assessment passes with evidence");
  await page.screenshot({ path: path.join(OUT, "aditya-topic.png"), fullPage: true });

  // Upload an image proof via the proof page
  await page.goto(`${BASE}/proof`);
  await page.selectOption('aside select[name="type"]', "image");
  await page.fill('aside input[name="title"]', "Screenshot of DevTools memory panel");
  const png = path.join(OUT, "tiny.png");
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
  await page.setInputFiles('aside input[type="file"]', png);
  await page.selectOption('aside select[name="topicId"]', "fe-t1-1-1");
  await page.getByRole("button", { name: "Save proof of work" }).click();
  await page.getByText("Proof of work saved").waitFor();
  const img = page.locator('img[alt^="Screenshot:"]').first();
  const src = await img.getAttribute("src");
  const fileRes = await page.request.get(`${BASE}${src}`);
  check(fileRes.status() === 200 && fileRes.headers()["content-type"] === "image/png", "Uploaded file is served to its owner");

  // Today planner: complete first task with time
  await page.goto(`${BASE}/today`);
  const firstTask = page.locator('button[aria-label^="Complete"]').first();
  if (await firstTask.count()) {
    await firstTask.click();
    await page.getByRole("button", { name: "Mark done" }).click();
    await page.getByText(/Done — \d+ minutes logged|Marked as done/).waitFor();
    check(true, "Daily task completed with logged time");
  }
  // Custom task
  await page.fill("#task-title", "Read the Fiber architecture doc");
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByText("Task added").waitFor();
  check(true, "Custom task added");

  // Projects: open the weekend project
  await page.goto(`${BASE}/projects`);
  const projLink = page.locator('a[href^="/projects/"]').first();
  check((await projLink.count()) > 0, "A weekend project exists");
  await projLink.click();
  await page.waitForFunction(() => /^\/projects\/./.test(location.pathname));
  await page.getByText("Requirements").first().waitFor();
  check(await page.getByText("Requirements").isVisible(), "Project brief shows requirements");
  await page.screenshot({ path: path.join(OUT, "aditya-project.png"), fullPage: true });

  // Resources: bookmark
  await page.goto(`${BASE}/resources`);
  await page.locator('button[aria-label^="Bookmark"]').first().click();
  await page.locator('button[aria-label^="Remove bookmark"]').first().waitFor();
  check(true, "Resource bookmarked");

  // Streak reflects meaningful activity
  await page.goto(`${BASE}/`);
  check(await page.getByText(/1 day/).first().isVisible(), "Streak shows 1 day after meaningful activity");
  await page.screenshot({ path: path.join(OUT, "aditya-dashboard-after.png"), fullPage: true });

  // ── Aditya, mobile ───────────────────────────────────────────────
  console.log("Aditya (mobile)");
  const state = await adi.storageState();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: state, isMobile: true, hasTouch: true });
  const mp = await mobile.newPage();
  watch(mp, "mobile");
  for (const r of ["/", "/today", "/roadmap", "/roadmap/fe-t1-1-1", "/calendar", "/projects", "/proof", "/resources", "/progress"]) {
    await mp.goto(`${BASE}${r}`);
    await noOverflow(mp, `mobile ${r}`);
    await mp.screenshot({ path: path.join(OUT, `mobile-${r.replace(/\//g, "_") || "home"}.png`), fullPage: r === "/" });
  }
  await mp.getByRole("button", { name: "More" }).click();
  check(await mp.getByRole("dialog", { name: "More navigation" }).isVisible(), "Mobile More sheet opens");

  // Dark theme
  const dark = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: state, colorScheme: "dark" });
  const dp = await dark.newPage();
  await dp.goto(`${BASE}/`);
  await dp.screenshot({ path: path.join(OUT, "aditya-dark.png"), fullPage: true });
  await dp.goto(`${BASE}/progress`);
  await dp.screenshot({ path: path.join(OUT, "aditya-dark-progress.png"), fullPage: true });

  // Theme choice is saved in localStorage and survives a reload (no server round-trip).
  await page.goto(`${BASE}/`);
  await page.locator("aside").getByRole("button", { name: /theme/ }).click(); // system -> light
  await page.locator("aside").getByRole("button", { name: /theme/ }).click(); // light -> dark
  await page.reload();
  check((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark", "Theme choice persists across reloads (localStorage)");
  await page.locator("aside").getByRole("button", { name: /theme/ }).click(); // dark -> system
  check((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) === null, "System theme restored");
  // Session survives reloads and navigation.
  await page.reload();
  check(!page.url().endsWith("/login"), "Session persists after reload");

  // Logout
  await page.goto(`${BASE}/settings`);
  await page.locator("aside").getByRole("button", { name: "Log out" }).click();
  await page.waitForFunction(() => location.pathname === "/login");
  const after = await page.goto(`${BASE}/progress`);
  check(after?.url().endsWith("/login"), "After logout, private pages redirect to login");

  // ── Harsh ────────────────────────────────────────────────────────
  console.log("Harsh (desktop)");
  const harsh = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const hp = await login(harsh, "Harsh Suthar", harshPass);
  await onboard(hp, "Harsh", "2", "4");
  await visitAll(hp, "Harsh Suthar", true);
  const cross = await hp.goto(`${BASE}/roadmap/fe-t1-1-1`);
  check(cross?.status() === 404, `Harsh cannot open a frontend topic (status ${cross?.status()})`);
  const crossFile = await hp.request.get(`${BASE}${src}`);
  check(crossFile.status() === 404, `Harsh cannot download Aditya's uploaded file (status ${crossFile.status()})`);
  check(await hp.getByText("AI-Native Product Designer").first().isVisible(), "Harsh sees the product designer path");

  await browser.close();
  console.log(failures.length ? `\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}` : "\nAll checks passed.");
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  console.log(failures.length ? `\nFailures before crash:\n- ${failures.join("\n- ")}` : "");
  process.exit(1);
});
