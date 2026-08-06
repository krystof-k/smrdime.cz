import { expect, test } from "@playwright/test";
import { mockBus, mockWeather, sampleBusStatus, sampleWeather } from "./mocks";

test.describe("bus page", () => {
  test.beforeEach(async ({ page }) => {
    await mockBus(page, sampleBusStatus);
    await mockWeather(page, sampleWeather);
  });

  test("renders the bus headline, title and line cards", async ({ page }) => {
    await page.goto("/autobusy");
    await expect(page).toHaveTitle(/autobusů/);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("autobusů");
    await expect(heading).toContainText("bez klimatizace");
    await expect(page.getByText("90").first()).toBeVisible();
    await expect(page.getByText("3/20")).toBeVisible();
    await expect(page.getByText("11/15")).toBeVisible();
  });

  test("summary skips the tram-only AC fleet clause", async ({ page }) => {
    await page.goto("/autobusy");
    await expect(page.getByText(/z 300 autobusů/)).toBeVisible();
    await expect(page.getByText(/na trase/)).toBeVisible();
    await expect(page.getByText(/ze všech/)).toHaveCount(0);
  });

  test("dpp.cz popover cites the DPP fleet AC share and mentions contracted operators", async ({
    page,
  }) => {
    await page.goto("/autobusy");
    await page.getByRole("button", { name: "dpp.cz" }).click();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("smluvní dopravci PID");
    await expect(tooltip).toContainText("73,12");
    await expect(tooltip).toContainText("jeho vozového parku");
  });

  test("trolleybus lines get their own emoji on the line card in cool weather", async ({
    page,
  }) => {
    await mockWeather(page, { temperature: 15 });
    await page.goto("/autobusy");
    await expect(page.getByText("🚎")).toBeVisible();
    await expect(page.getByText("7/7")).toBeVisible();
  });

  test("layover toggle uses bus wording", async ({ page }) => {
    await page.goto("/autobusy");
    await expect(page.getByText(/na trase/)).toBeVisible();

    await page.getByRole("button", { name: /Zahrnout i autobusy na konečných/ }).click();
    await expect(page.getByText("100").first()).toBeVisible();
    await expect(page.getByText(/v provozu/)).toBeVisible();

    await page.getByRole("button", { name: /Zobrazit jen autobusy na trase/ }).click();
    await expect(page.getByText("90").first()).toBeVisible();
  });

  test("error view speaks about buses", async ({ page }) => {
    await mockBus(page, { error: "Failed to fetch vehicle status" }, 500);
    await page.goto("/autobusy");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("chaos");
    await expect(heading).toContainText("kolik autobusů jede bez klimatizace");
    await expect(page.getByText(/v garáži/)).toBeVisible();
  });
});
