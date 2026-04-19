import { expect, test } from "@playwright/test";

const sampleTramStatus = {
  totalVehicles: 120,
  vehiclesWithAC: 40,
  vehiclesWithoutAC: 80,
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

const sampleBusStatus = {
  totalVehicles: 300,
  vehiclesWithAC: 180,
  vehiclesWithoutAC: 120,
  lastUpdated: new Date("2026-04-19T12:00:00Z").toISOString(),
  lineDetails: [
    {
      lineNumber: "100",
      routeId: "bus-100",
      totalVehicles: 30,
      vehiclesWithAC: 20,
      vehiclesWithoutAC: 10,
      status: "completed",
    },
    {
      lineNumber: "136",
      routeId: "bus-136",
      totalVehicles: 25,
      vehiclesWithAC: 10,
      vehiclesWithoutAC: 15,
      status: "completed",
    },
  ],
};

const sampleWeather = { temperature: 28 };

async function mockTram(page: import("@playwright/test").Page, payload: unknown, status = 200) {
  await page.route("**/api/tram", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}

async function mockBus(page: import("@playwright/test").Page, payload: unknown, status = 200) {
  await page.route("**/api/bus", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
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
    await mockTram(page, sampleTramStatus);
    await mockBus(page, sampleBusStatus);
    await mockWeather(page, sampleWeather);
  });

  test("renders both tram and bus headlines with the shared temperature", async ({ page }) => {
    await page.goto("/");
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(2);
    await expect(headings.nth(0)).toContainText("Praze");
    await expect(headings.nth(0)).toContainText("tramvají");
    await expect(headings.nth(1)).toContainText("autobusů");
    await expect(headings.nth(1)).not.toContainText("V Praze");
    await expect(page.getByText("28°C")).toBeVisible();
    await expect(page.getByText("80").first()).toBeVisible();
    await expect(page.getByText("120").first()).toBeVisible();
  });

  test("tap-to-toggle flips both sections between counts and percentages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("28°C")).toBeVisible();
    await expect(page.getByText("80").first()).toBeVisible();

    await page.getByRole("heading", { level: 1 }).first().click();
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings.nth(0)).toContainText("%");
    await expect(headings.nth(1)).toContainText("%");
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

  test("dpp.cz popover reveals the 15T + 52T breakdown on the tram side", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "dpp.cz" }).first().click();
    const tooltip = page.getByRole("tooltip").first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("127");
    await expect(tooltip).toContainText("Škoda 15T");
    await expect(tooltip).toContainText("20");
    await expect(tooltip).toContainText("Škoda 52T");
  });

  test("dpp.cz popover on the bus side cites the AC % and fleet size", async ({ page }) => {
    await page.goto("/");
    const busPopoverTrigger = page.getByRole("button", { name: "dpp.cz" }).last();
    await busPopoverTrigger.click();
    const tooltip = page.getByRole("tooltip").last();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("66,18");
    await expect(tooltip).toContainText("autobus");
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

test.describe("tram upstream error", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, { error: "Failed to fetch tram status" }, 500);
    await mockBus(page, sampleBusStatus);
    await mockWeather(page, sampleWeather);
  });

  test("shows error only on the tram section; bus section still renders", async ({ page }) => {
    await page.goto("/");
    const errorHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: "chaos" });
    await expect(errorHeading).toBeVisible();
    await expect(errorHeading).toContainText("tramvají");
    await expect(page.getByRole("button", { name: "znovu" })).toBeVisible();
    const busHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: "autobusů" });
    await expect(busHeading).toBeVisible();
  });
});

test.describe("bus upstream error", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, sampleTramStatus);
    await mockBus(page, { error: "Failed to fetch bus status" }, 500);
    await mockWeather(page, sampleWeather);
  });

  test("shows error only on the bus section; tram section still renders", async ({ page }) => {
    await page.goto("/");
    const tramHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: "tramvají" });
    await expect(tramHeading).toBeVisible();
    await expect(tramHeading).toContainText("V Praze");
    const errorHeading = page.getByRole("heading", { level: 1 }).filter({ hasText: "chaos" });
    await expect(errorHeading).toBeVisible();
    await expect(errorHeading).toContainText("autobusů");
  });
});

test.describe("weather missing", () => {
  test.beforeEach(async ({ page }) => {
    await mockTram(page, sampleTramStatus);
    await mockBus(page, sampleBusStatus);
    await mockWeather(page, { error: "boom" }, 500);
  });

  test("renders the headlines without temperature when weather is unavailable", async ({
    page,
  }) => {
    await page.goto("/");
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings.nth(0)).toContainText("V Praze jezdí");
    await expect(headings.nth(0)).not.toContainText("°C");
    await expect(headings.nth(1)).toContainText("autobusů");
  });
});
