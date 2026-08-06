/**
 * AC-equipped tram subfleets. Source: DPP FAQ (see `DPP_AC_FAQ_URL`) and the
 * 52T rolling stock page (`DPP_52T_URL`). Last verified: 2026-08-06 — the FAQ
 * still states 20 × 52T "k 31. prosinci 2025" and expects +20 during 2026,
 * so re-check after DPP announces new deliveries.
 *
 *   - Škoda 15T: second delivery
 *   - Škoda 52T: delivered by 2025-12-18; 71 ordered in total, rolling out
 *     through 2027
 */
export const AC_FLEET_15T = 127;
export const AC_FLEET_52T = 20;
export const AC_FLEET_TOTAL = AC_FLEET_15T + AC_FLEET_52T;

/**
 * Share of DPP's bus fleet with full AC, as stated on the DPP FAQ
 * (`DPP_AC_FAQ_URL`): "K 25. červnu 2026 má DPP ve vozovém parku 73,12 %
 * plně klimatizovaných autobusů." DPP gives no absolute count for buses, so
 * the bus summary cites this share instead of a "ze všech N" clause.
 *
 * The figure covers DPP's own fleet only — city lines are also run by
 * contracted PID operators (live feed 2026-08-06: ~85 % of city-bus records
 * are DPP; the rest ARRIVA CITY, ABOUT ME, ČSAD SČ, STENBUS and others), so
 * the popover attributes it explicitly to DPP's fleet.
 * Last verified: 2026-08-06.
 */
export const AC_BUS_FLEET_SHARE = "73,12";
export const AC_BUS_FLEET_SHARE_DATE = "25. červnu 2026";

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
