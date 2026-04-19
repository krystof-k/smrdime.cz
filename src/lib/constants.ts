/**
 * AC-equipped tram subfleets. Source: DPP FAQ (see `DPP_AC_FAQ_URL`) and the
 * 52T rolling stock page (`DPP_52T_URL`). Last verified: 2026-04-19. Update
 * whenever DPP publishes new delivery milestones.
 *
 *   - Škoda 15T: second delivery
 *   - Škoda 52T: delivered by 2025-12-18; 71 ordered in total, rolling out
 *     through 2027
 */
export const AC_FLEET_15T = 127;
export const AC_FLEET_52T = 20;
export const AC_FLEET_TOTAL = AC_FLEET_15T + AC_FLEET_52T;

// Edge cache on /api/tram dedupes globally at 30 s; client polling more
// frequently still sees fresh-ish data cheaply via cache hits.
export const REFRESH_INTERVAL_MS = 10_000;

// Weather changes slowly; the proxy edge-caches for 5 min, so polling more
// frequently from the client just spends bandwidth without seeing fresh data.
export const WEATHER_REFRESH_INTERVAL_MS = 5 * 60_000;

const PRAGUE_COORDS = { latitude: 50.0755, longitude: 14.4378 } as const;

export const WEATHER_API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${PRAGUE_COORDS.latitude}&longitude=${PRAGUE_COORDS.longitude}&current_weather=true`;

export const DPP_AC_FAQ_URL =
  "https://www.dpp.cz/kontakt/casto-kladene-dotazy/detail/44_1144-funguje-ve-vozech-mhd-klimatizace";

export const DPP_52T_URL =
  "https://www.dpp.cz/spolecnost/o-spolecnosti/vozovy-park/tramvaje/skoda-52t";

export const DPP_BUS_STATS_URL =
  "https://www.dpp.cz/spolecnost/o-spolecnosti/profil-spolecnosti/statistiky-dpp";

/**
 * AC-equipped buses in the DPP fleet. Source: DPP FAQ (DPP_AC_FAQ_URL) —
 * "K 31. květnu 2025 má DPP v autobusové flotile 66,18 % plně klimatizovaných
 * autobusů" — applied to the 1 277-vehicle fleet reported on DPP_BUS_STATS_URL:
 * 1 277 × 0.6618 ≈ 845. Last verified: 2026-04-19.
 */
export const AC_FLEET_BUS_TOTAL = 845;
export const BUS_FLEET_TOTAL = 1277;
export const BUS_AC_PERCENTAGE = 66.18;
