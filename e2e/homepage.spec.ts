import { expect, test } from "@playwright/test";
import {
  AC_FLEET_15T_FACTORY,
  AC_FLEET_52T,
  AC_FLEET_TOTAL,
  AC_RETROFITTED_15T,
} from "../src/lib/constants.ts";
import {
  mockBus,
  mockTram,
  mockWeather,
  sampleBusStatus,
  sampleTramStatus,
  sampleWeather,
} from "./mocks";

test.describe("happy path", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, sampleTramStatus);
    await mockWeather(page, sampleWeather);
  });

  test("renders the headline with temperature and tram count", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Praze");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("bez klimatizace");
    await expect(page.getByText(/28\s?°C/)).toBeVisible();
    await expect(page.getByText("80").first()).toBeVisible();
    await expect(page.getByText(new RegExp(String(AC_FLEET_TOTAL)))).toBeVisible();
  });

  test("tap-to-toggle flips between counts and percentages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/28\s?°C/)).toBeVisible();
    await expect(page.getByText("80").first()).toBeVisible();

    await page.getByRole("heading", { level: 1 }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("%");
  });

  test("toggle button switches the label and reflects pressed state", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Přepnout na zobrazení procent/ });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: /Přepnout na zobrazení počtů/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("layover toggle switches to in-service counts and wording", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("80").first()).toBeVisible();
    await expect(page.getByText(/na trati/)).toBeVisible();

    await page.getByRole("button", { name: /Zahrnout i tramvaje na konečných/ }).click();
    await expect(page.getByText("100").first()).toBeVisible();
    await expect(page.getByText(/v provozu/)).toBeVisible();

    await page.getByRole("button", { name: /Zobrazit jen tramvaje na trati/ }).click();
    await expect(page.getByText("80").first()).toBeVisible();
  });

  test("dpp.cz popover reveals the 15T + retrofit + 52T breakdown", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "dpp.cz" }).click();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(String(AC_FLEET_15T_FACTORY));
    await expect(tooltip).toContainText("Škoda 15T");
    await expect(tooltip).toContainText("doklimatizované");
    await expect(tooltip).toContainText(String(AC_RETROFITTED_15T.length));
    await expect(tooltip).toContainText(String(AC_FLEET_52T));
    await expect(tooltip).toContainText("Škoda 52T");
  });

  test("line search expands from the magnifier, filters, and collapses on Escape", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("5/20")).toBeVisible();
    await expect(page.getByText("12/15")).toBeVisible();

    // Click a card corner away from the emoji — the whole card must open the
    // search without triggering the page-wide counts/percentages toggle.
    await page.getByRole("button", { name: "Hledat linku" }).click({ position: { x: 50, y: 6 } });
    const search = page.getByRole("searchbox", { name: "Hledat linku" });
    await expect(search).toBeFocused();
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("%");
    await search.fill("2");
    await expect(page.getByText("12/15")).toBeVisible();
    await expect(page.getByText("5/20")).not.toBeVisible();

    await page.getByRole("search").click({ position: { x: 155, y: 6 } });
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText("%");
    await expect(search).toBeVisible();

    await search.fill("42");
    await expect(
      page.getByText("Linka „42“ teď nejspíš nejezdí, nebo ji nesledujeme."),
    ).toBeVisible();

    await search.press("Escape");
    await expect(search).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Hledat linku" })).toBeVisible();
    await expect(page.getByText("5/20")).toBeVisible();
    await expect(page.getByText("12/15")).toBeVisible();
  });

  test("typing a digit anywhere opens the search and filters", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("5/20")).toBeVisible();

    await page.keyboard.type("2");
    const search = page.getByRole("searchbox", { name: "Hledat linku" });
    await expect(search).toHaveValue("2");
    await expect(search).toBeFocused();
    await expect(page.getByText("12/15")).toBeVisible();
    await expect(page.getByText("5/20")).not.toBeVisible();

    await page.keyboard.type("2");
    await expect(search).toHaveValue("22");
  });

  test("share click pre-renders the OG card for the shared URL", async ({ page }) => {
    const ogRequests: string[] = [];
    await page.route("**/og?*", (route) => {
      ogRequests.push(route.request().url());
      return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("") });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Sdílet" }).click();
    await expect.poll(() => ogRequests.length).toBeGreaterThan(0);
    expect(ogRequests[0]).toMatch(/\/og\?t=[0-9a-z]+$/);
  });

  test("pause button toggles aria-pressed", async ({ page }) => {
    await page.goto("/");
    const pauseButton = page.getByRole("button", {
      name: /Pozastavit automatické aktualizace/,
    });
    await expect(pauseButton).toHaveAttribute("aria-pressed", "false");
    await pauseButton.click();
    await expect(
      page.getByRole("button", { name: /Obnovit automatické aktualizace/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("mode switch link navigates to buses and back", async ({ page }) => {
    await mockBus(page, sampleBusStatus);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("tramvají");

    await page.getByRole("link", { name: /A co autobusy\?/ }).click();
    await expect(page).toHaveURL("/autobusy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("autobusů");
    await expect(page.getByText("90").first()).toBeVisible();

    await page.getByRole("link", { name: /A co tramvaje\?/ }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("tramvají");
    await expect(page.getByText("80").first()).toBeVisible();
  });
});

test.describe("error state", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, { error: "Failed to fetch tram status" }, 500);
    await mockWeather(page, sampleWeather);
  });

  test("renders the error view with a retry button", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("chaos");
    await expect(heading).toContainText("nevíme");
    await expect(page.getByRole("button", { name: "znovu" })).toBeVisible();
  });
});

test.describe("weather missing", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, sampleTramStatus);
    await mockWeather(page, { error: "boom" }, 500);
  });

  test("renders the headline without temperature when weather is unavailable", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("V Praze jezdí");
    await expect(heading).not.toContainText("°C");
  });
});
