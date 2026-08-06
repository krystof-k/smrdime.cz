import type { Page } from "@playwright/test";

export const sampleTramLineDetails = [
  {
    lineNumber: "9",
    routeId: "9",
    totalVehicles: 20,
    vehiclesWithAC: 5,
    vehiclesWithoutAC: 15,
  },
  {
    lineNumber: "22",
    routeId: "22",
    totalVehicles: 15,
    vehiclesWithAC: 12,
    vehiclesWithoutAC: 3,
  },
];

export const sampleTramStatus = {
  onTrack: {
    totalVehicles: 120,
    vehiclesWithAC: 40,
    vehiclesWithoutAC: 80,
    lineDetails: sampleTramLineDetails,
  },
  inService: {
    totalVehicles: 150,
    vehiclesWithAC: 50,
    vehiclesWithoutAC: 100,
    lineDetails: sampleTramLineDetails,
  },
  lastUpdated: new Date("2026-04-19T12:00:00Z").toISOString(),
};

export const sampleBusLineDetails = [
  {
    lineNumber: "119",
    routeId: "119",
    totalVehicles: 20,
    vehiclesWithAC: 3,
    vehiclesWithoutAC: 17,
  },
  {
    lineNumber: "213",
    routeId: "213",
    totalVehicles: 15,
    vehiclesWithAC: 11,
    vehiclesWithoutAC: 4,
  },
];

export const sampleBusStatus = {
  onTrack: {
    totalVehicles: 300,
    vehiclesWithAC: 210,
    vehiclesWithoutAC: 90,
    lineDetails: sampleBusLineDetails,
  },
  inService: {
    totalVehicles: 320,
    vehiclesWithAC: 220,
    vehiclesWithoutAC: 100,
    lineDetails: sampleBusLineDetails,
  },
  lastUpdated: new Date("2026-04-19T12:00:00Z").toISOString(),
};

export const sampleWeather = { temperature: 28 };

export async function mockTram(page: Page, payload: unknown, status = 200) {
  await page.route("**/api/tram", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}

export async function mockBus(page: Page, payload: unknown, status = 200) {
  await page.route("**/api/bus", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}

export async function mockWeather(page: Page, payload: unknown, status = 200) {
  await page.route("**/api/weather", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  );
}
