import { test, expect } from "@playwright/test";

test.describe("Tab 1 — Real Hourly Wage", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/"); });

  test("loads with wage tab active", async ({ page }) => {
    await expect(page.locator(".tab--active")).toHaveText(/Real Hourly Wage/);
    await expect(page.locator("#panel-wage")).toBeVisible();
  });

  test("displays calculated real wage on load", async ({ page }) => {
    const val = page.locator("#res-real-wage");
    await expect(val).not.toHaveText("—");
    const text = await val.textContent();
    expect(text).toMatch(/^\$[\d,.]+$/);
  });

  test("increasing salary increases real wage", async ({ page }) => {
    const initial = await page.locator("#res-real-wage").textContent();
    await page.fill("#w-salary", "120000");
    await page.waitForTimeout(100);
    const updated = await page.locator("#res-real-wage").textContent();
    const i = parseFloat(initial!.replace(/[$,]/g, ""));
    const u = parseFloat(updated!.replace(/[$,]/g, ""));
    expect(u).toBeGreaterThan(i);
  });

  test("increasing commute decreases real wage", async ({ page }) => {
    const initial = await page.locator("#res-real-wage").textContent();
    await page.fill("#w-commute-time", "120");
    await page.waitForTimeout(100);
    const updated = await page.locator("#res-real-wage").textContent();
    const i = parseFloat(initial!.replace(/[$,]/g, ""));
    const u = parseFloat(updated!.replace(/[$,]/g, ""));
    expect(u).toBeLessThan(i);
  });

  test("state dropdown changes taxes", async ({ page }) => {
    const ilTax = await page.locator("#bd-tax-total").textContent();
    await page.selectOption("#w-state", "TX");
    await page.waitForTimeout(100);
    const txTax = await page.locator("#bd-tax-total").textContent();
    const il = parseFloat(ilTax!.replace(/[-$,]/g, ""));
    const tx = parseFloat(txTax!.replace(/[-$,]/g, ""));
    expect(tx).toBeLessThan(il);
  });

  test("gap bar renders", async ({ page }) => {
    const bar = page.locator("#gap-bar-real");
    const width = await bar.evaluate((el) => el.style.width);
    expect(parseFloat(width)).toBeGreaterThan(0);
  });

  test("breakdown rows are populated", async ({ page }) => {
    await expect(page.locator("#bd-gross")).not.toHaveText("—");
    await expect(page.locator("#bd-total-hrs")).not.toHaveText("—");
  });
});

test.describe("Tab 2 — Decision Calculator", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-tab="decision"]');
  });

  test("switches to decision tab", async ({ page }) => {
    await expect(page.locator("#panel-decision")).toBeVisible();
  });

  test("auto-fills wage from Tab 1", async ({ page }) => {
    const wage = await page.locator("#d-wage").inputValue();
    expect(parseFloat(wage)).toBeGreaterThan(0);
  });

  test("shows verdict with valid inputs", async ({ page }) => {
    await page.fill("#d-hours", "2");
    await page.fill("#d-cost", "75");
    await page.waitForTimeout(100);
    const verdict = await page.locator("#res-verdict").textContent();
    expect(verdict).toMatch(/Hire someone|Do it yourself/);
  });

  test("preset tiles fill inputs", async ({ page }) => {
    await page.click('[data-preset="mow"]');
    await page.waitForTimeout(100);
    const hours = await page.locator("#d-hours").inputValue();
    expect(parseFloat(hours)).toBe(1.5);
    const cost = await page.locator("#d-cost").inputValue();
    expect(parseFloat(cost)).toBe(50);
  });

  test("6 preset tiles are rendered", async ({ page }) => {
    const tiles = page.locator(".preset-tile");
    await expect(tiles).toHaveCount(6);
  });

  test("explanation text appears", async ({ page }) => {
    await page.fill("#d-hours", "3");
    await page.fill("#d-cost", "120");
    await page.waitForTimeout(100);
    const exp = await page.locator("#res-explanation").textContent();
    expect(exp!.length).toBeGreaterThan(10);
  });
});

test.describe("Tab 3 — Compare Jobs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.click('[data-tab="compare"]');
  });

  test("switches to compare tab", async ({ page }) => {
    await expect(page.locator("#panel-compare")).toBeVisible();
  });

  test("shows winner with default inputs", async ({ page }) => {
    const winner = await page.locator("#res-compare-winner").textContent();
    expect(winner).not.toBe("—");
  });

  test("comparison table has values", async ({ page }) => {
    await expect(page.locator("#ct-salary-a")).not.toHaveText("—");
    await expect(page.locator("#ct-wage-a")).not.toHaveText("—");
    await expect(page.locator("#ct-wage-b")).not.toHaveText("—");
  });

  test("changing salary updates comparison", async ({ page }) => {
    const initial = await page.locator("#res-compare-winner").textContent();
    await page.fill("#jb-salary", "200000");
    await page.waitForTimeout(100);
    const updated = await page.locator("#ct-wage-b").textContent();
    const val = parseFloat(updated!.replace(/[$,]/g, ""));
    expect(val).toBeGreaterThan(30);
  });

  test("insight text is populated", async ({ page }) => {
    const insight = await page.locator("#res-compare-insight").textContent();
    expect(insight!.length).toBeGreaterThan(10);
  });
});

test.describe("Cross-cutting", () => {
  test("page has correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/What Is My Time Worth/);
  });

  test("structured data is present", async ({ page }) => {
    await page.goto("/");
    const ld = page.locator('script[type="application/ld+json"]');
    const json = await ld.textContent();
    expect(json).toContain("FinanceApplication");
  });

  test("tab switching preserves values", async ({ page }) => {
    await page.goto("/");
    await page.fill("#w-salary", "99999");
    await page.click('[data-tab="decision"]');
    await page.click('[data-tab="wage"]');
    await expect(page.locator("#w-salary")).toHaveValue("99999");
  });

  test("footer links are present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href*="ko-fi"]')).toBeVisible();
    await expect(page.locator('a[href*="github"]')).toBeVisible();
    await expect(page.locator('a[href*="substack"]')).toBeVisible();
    await expect(page.locator('a[href*="buymeacoffee"]')).toBeVisible();
  });
});
