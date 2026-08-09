/**
 * AC-equipped tram subfleets. The two growing values are ratcheted up from
 * the live feed by scripts/check-ac-fleet.mjs (the Fleet watch workflow PRs
 * the bumps); registration ranges per the DPP retrofit press release
 * (`DPP_RETROFIT_URL`) and verified against live feed AC flags 2026-08-09.
 *
 *   - AC_FLEET_15T_FACTORY: second-delivery 15T with factory AC
 *     (registrations 9326–9450) — fixed.
 *   - AC_RETROFITTED_15T: first-delivery 15T (9201–9325) seen reporting AC.
 *     Two pilot conversions so far; DPP tendered the remaining 123 at a pace
 *     of 20+ per year.
 *   - AC_FLEET_52T: 52T seen in passenger service (registrations from 9501
 *     up); 71 ordered in total, rolling out through 2027.
 */
export const AC_FLEET_15T_FACTORY = 125;
export const AC_RETROFITTED_15T = [9243, 9285];
export const AC_FLEET_52T = 21;
export const AC_FLEET_TOTAL = AC_FLEET_15T_FACTORY + AC_RETROFITTED_15T.length + AC_FLEET_52T;

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

export const DPP_RETROFIT_URL =
  "https://www.dpp.cz/spolecnost/pro-media/tiskove-zpravy/detail/278_3061-dpp-chysta-doklimatizaci-tramvaji-skoda-15t-hleda-pro-ni-dodavatele";
