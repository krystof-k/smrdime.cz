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
    await expect(page.getByText(/na lince/)).toBeVisible();
    await expect(page.getByText(/klimatizovaných/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "dpp.cz" })).toHaveCount(0);
  });

  test("layover toggle uses bus wording", async ({ page }) => {
    await page.goto("/autobusy");
    await expect(page.getByText(/na lince/)).toBeVisible();

    await page.getByRole("button", { name: /Zahrnout i autobusy na konečných/ }).click();
    await expect(page.getByText("100").first()).toBeVisible();
    await expect(page.getByText(/v provozu/)).toBeVisible();

    await page.getByRole("button", { name: /Zobrazit jen autobusy na lince/ }).click();
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
