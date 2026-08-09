// Ratchets the growing AC tram-fleet constants in src/lib/constants.ts from
// the live Golemio feed: the count of 52T in passenger service (sequential
// registrations from 9501) and the list of retrofitted first-delivery 15T
// (9201–9325 reporting AC). Values only grow — a tram absent from one
// snapshot is parked in the depot, not gone — so a run only needs to catch a
// new tram in service once. Run by .github/workflows/fleet-watch.yml, which
// opens a PR with any change; locally: GOLEMIO_API_KEY=… node scripts/check-ac-fleet.mjs
import { readFileSync, writeFileSync } from "node:fs";

const CONSTANTS_PATH = new URL("../src/lib/constants.ts", import.meta.url);

const FIRST_52T_REGISTRATION = 9501;
// 71 ordered in total — a "52T" above this range is a feed glitch, not a tram.
const LAST_52T_REGISTRATION = 9571;
const RETROFIT_RANGE = { from: 9201, to: 9325 };

const apiKey = process.env.GOLEMIO_API_KEY;
if (!apiKey) throw new Error("GOLEMIO_API_KEY is not set");

// A feed outage is Golemio's problem, not ours — skip quietly and let the
// next scheduled run retry instead of painting the Actions tab red.
let feed;
try {
  const response = await fetch(
    "https://api.golemio.cz/v2/vehiclepositions?limit=10000&includeNotTracking=true",
    {
      headers: { "X-Access-Token": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  feed = await response.json();
} catch (err) {
  console.log(`Feed unavailable (${err.message}), skipping this run.`);
  process.exit(0);
}

const trams = feed.features
  .map((feature) => feature.properties.trip)
  .filter((trip) => trip.gtfs.route_type === 0);
if (trams.length === 0) {
  console.log("No trams in the feed — upstream outage, skipping this run.");
  process.exit(0);
}

const seen52 = [];
const seenRetrofits = new Set();
for (const trip of trams) {
  const registration = trip.vehicle_registration_number;
  if (registration == null) continue;
  if (registration >= FIRST_52T_REGISTRATION && registration <= LAST_52T_REGISTRATION) {
    seen52.push(registration);
  }
  if (
    registration >= RETROFIT_RANGE.from &&
    registration <= RETROFIT_RANGE.to &&
    trip.air_conditioned === true
  ) {
    seenRetrofits.add(registration);
  }
}

const source = readFileSync(CONSTANTS_PATH, "utf8");
const count52Match = source.match(/AC_FLEET_52T = (\d+)/);
const retrofitsMatch = source.match(/AC_RETROFITTED_15T = \[([^\]]*)\]/);
if (!count52Match || !retrofitsMatch) {
  throw new Error("constants.ts no longer matches the shape this script expects");
}

const current52 = Number(count52Match[1]);
const next52 = Math.max(
  current52,
  ...seen52.map((registration) => registration - FIRST_52T_REGISTRATION + 1),
);

const currentRetrofits = (retrofitsMatch[1].match(/\d+/g) ?? []).map(Number);
const nextRetrofits = [...new Set([...currentRetrofits, ...seenRetrofits])].sort((a, b) => a - b);

const changes = [];
if (next52 > current52) changes.push(`52T in service ${current52} → ${next52}`);
if (nextRetrofits.length > currentRetrofits.length) {
  const added = nextRetrofits.filter((registration) => !currentRetrofits.includes(registration));
  changes.push(
    `retrofitted 15T ${currentRetrofits.length} → ${nextRetrofits.length} (${added.join(", ")})`,
  );
}

if (changes.length === 0) {
  console.log("Fleet constants are up to date.");
  process.exit(0);
}

const updated = source
  .replace(count52Match[0], `AC_FLEET_52T = ${next52}`)
  .replace(retrofitsMatch[0], `AC_RETROFITTED_15T = [${nextRetrofits.join(", ")}]`);
writeFileSync(CONSTANTS_PATH, updated);
console.log(changes.join("; "));
