import { expect, test } from "@playwright/test";

const sampleTramStatus = {
  totalTrams: 120,
  tramsWithAC: 40,
  tramsWithoutAC: 80,
  lastUpdated: new Date("2026-04-19T12:00:00Z").toISOString(),
  lineDetails: [
    {
      lineNumber: "9",
      routeId: "9",
      totalVehicles: 20,
      vehiclesWithAC: 5,
      vehiclesWithoutAC: 15,
      status: "completed",
    },
    {
      lineNumber: "22",
      routeId: "22",
      totalVehicles: 15,
      vehiclesWithAC: 12,
      vehiclesWithoutAC: 3,
      status: "completed",
    },
  ],
};

const sampleWeather = { temperature: 28 };

async function mockTramStream(page: import("@playwright/test").Page, payload: unknown) {
  await page.routeWebSocket("**/api/tram/stream", (ws) => {
    ws.send(JSON.stringify(payload));
  });
}

async function refuseTramStream(page: import("@playwright/test").Page) {
  await page.routeWebSocket("**/api/tram/stream", (ws) => {
    ws.close({ code: 1011, reason: "upstream failure" });
  });
}

async function mockWeather(page: import("@playwright/test").Page, payload: unknown, status = 200) {
  await page.route("**/api/weather", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}

test.describe("happy path", () => {
  test.beforeEach(async ({ page }) => {
    await mockTramStream(page, sampleTramStatus);
    await mockWeather(page, sampleWeather);
  });

  test("renders the headline with temperature and tram count", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Praze");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("bez klimatizace");
    await expect(page.getByText("28°C")).toBeVisible();
    await expect(page.getByText("80").first()).toBeVisible();
    await expect(page.getByText(/147/)).toBeVisible();
  });

  test("tap-to-toggle flips between counts and percentages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("28°C")).toBeVisible();
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

  test("dpp.cz popover reveals the 15T + 52T breakdown", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "dpp.cz" }).click();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("127");
    await expect(tooltip).toContainText("Škoda 15T");
    await expect(tooltip).toContainText("20");
    await expect(tooltip).toContainText("Škoda 52T");
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
});

test.describe("error state", () => {
  test.beforeEach(async ({ page }) => {
    await refuseTramStream(page);
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
    await mockTramStream(page, sampleTramStatus);
    await mockWeather(page, { error: "boom" }, 500);
  });

  test("renders the headline without temperature when weather is unavailable", async ({ page }) => {
    await page.goto("/");
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toContainText("V Praze jezdí");
    await expect(heading).not.toContainText("°C");
  });
});
