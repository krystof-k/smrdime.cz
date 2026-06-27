/**
 * Below this temperature the UI drops the alarm vibe:
 *   - card emoji becomes a plain 🚋 regardless of AC coverage
 *   - card background becomes neutral grey
 *
 * Matches PID quality standard 4.2.9.2: under 22 °C the AC is not required
 * to be running, so there's nothing to complain about.
 */
export const COOL_CUTOFF_C = 22;

/**
 * One threshold, three outputs:
 *   - `textColor` / `emoji`: headline look at this temperature
 *   - `maxSeverity`: ceiling for AC_LEVELS when the card is rendered at this
 *     temperature (hotter weather allows angrier colors on the line cards).
 *     Only present on tiers at / above `COOL_CUTOFF_C` — below that the cards
 *     short-circuit to neutral grey / 🚋 and never consult maxSeverity.
 *
 * Kept as a single table so the thresholds can't drift out of sync.
 */
export type TemperatureTier = {
  minTemp: number;
  textColor: string;
  // sRGB hex of `textColor`'s light-mode class, derived from the Tailwind v4
  // OKLCH palette (regenerate from theme.css if the classes change). Lets the
  // OG renderer match the site, since Satori can't read Tailwind classes. Kept
  // beside textColor so the two can't drift.
  hex: string;
  emoji: string;
  maxSeverity?: number;
};

export const TEMPERATURE_TIERS: TemperatureTier[] = [
  {
    minTemp: 35,
    textColor: "text-red-600 dark:text-red-400",
    hex: "#e7000b",
    emoji: "🔥💀",
    maxSeverity: 5,
  },
  {
    minTemp: 30,
    textColor: "text-orange-500 dark:text-orange-400",
    hex: "#ff6900",
    emoji: "🌡️😭",
    maxSeverity: 4,
  },
  {
    minTemp: 25,
    textColor: "text-yellow-500 dark:text-yellow-300",
    hex: "#f0b100",
    emoji: "☀️😩",
    maxSeverity: 3,
  },
  {
    minTemp: 22,
    textColor: "text-green-500 dark:text-green-400",
    hex: "#00c950",
    emoji: "🌤️😒",
    maxSeverity: 2,
  },
  { minTemp: 20, textColor: "text-green-500 dark:text-green-400", hex: "#00c950", emoji: "🌤️😒" },
  { minTemp: 15, textColor: "text-blue-500 dark:text-blue-400", hex: "#2b7fff", emoji: "☁️🙄" },
  { minTemp: 10, textColor: "text-indigo-500 dark:text-indigo-400", hex: "#615fff", emoji: "🌬️😤" },
  { minTemp: 5, textColor: "text-purple-500 dark:text-purple-400", hex: "#ad46ff", emoji: "❄️😠" },
  { minTemp: 0, textColor: "text-blue-700 dark:text-blue-300", hex: "#1447e6", emoji: "🧊🤬" },
  {
    minTemp: Number.NEGATIVE_INFINITY,
    textColor: "text-blue-900 dark:text-blue-200",
    hex: "#1c398e",
    emoji: "💀🖕",
  },
];

function tierFor(temp: number): TemperatureTier {
  return (
    TEMPERATURE_TIERS.find((t) => temp >= t.minTemp) ??
    TEMPERATURE_TIERS[TEMPERATURE_TIERS.length - 1]
  );
}

/**
 * Neutral fallback used when the temperature is unknown (weather API hasn't
 * loaded or failed). Avoids the red/danger look that would imply "hot".
 */
export const NEUTRAL_TEXT_COLOR = "text-gray-500 dark:text-gray-400";

// Light-mode hex of NEUTRAL_TEXT_COLOR (gray-500), for the OG renderer.
export const NEUTRAL_HEX = "#6a7282";

export function getTemperatureColor(temp: number): string {
  return tierFor(temp).textColor;
}

export function getTemperatureHex(temp: number): string {
  return tierFor(temp).hex;
}

export function getTemperatureEmoji(temp: number): string {
  return tierFor(temp).emoji;
}

type ACLevel = {
  minPercentage: number;
  emoji: string;
  lightColor: string;
  darkColor: string;
  severity: number;
};

export const AC_LEVELS: ACLevel[] = [
  {
    minPercentage: 90,
    emoji: "🧊",
    lightColor: "oklch(from rgb(37 99 235) calc(l + 0.4) c h)",
    darkColor: "oklch(from rgb(37 99 235) calc(l - 0.3) c h)",
    severity: 0,
  },
  {
    minPercentage: 75,
    emoji: "❄️",
    lightColor: "oklch(from rgb(79 70 229) calc(l + 0.4) c h)",
    darkColor: "oklch(from rgb(79 70 229) calc(l - 0.25) c h)",
    severity: 1,
  },
  {
    minPercentage: 50,
    emoji: "😐",
    lightColor: "oklch(from rgb(34 197 94) calc(l + 0.4) c h)",
    darkColor: "oklch(from rgb(34 197 94) calc(l - 0.3) calc(c * 0.8) h)",
    severity: 2,
  },
  {
    minPercentage: 25,
    emoji: "☀️",
    lightColor: "oklch(from rgb(234 179 8) calc(l + 0.35) calc(c * 0.6) h)",
    darkColor: "oklch(from rgb(234 179 8) calc(l - 0.3) calc(c * 0.6) h)",
    severity: 3,
  },
  {
    minPercentage: 10,
    emoji: "🔥",
    lightColor: "oklch(from rgb(249 115 22) calc(l + 0.35) calc(c * 0.7) h)",
    darkColor: "oklch(from rgb(249 115 22) calc(l - 0.35) calc(c * 0.7) h)",
    severity: 4,
  },
  {
    minPercentage: 0,
    emoji: "💀",
    lightColor: "oklch(from rgb(239 68 68) calc(l + 0.35) calc(c * 0.7) h)",
    darkColor: "oklch(from rgb(239 68 68) calc(l - 0.35) calc(c * 0.7) h)",
    severity: 5,
  },
];

// Lookup by severity so levelFor doesn't re-scan AC_LEVELS every call.
const LEVEL_BY_SEVERITY = new Map(AC_LEVELS.map((level) => [level.severity, level]));

// Unknown temperature (weather still loading) must not imply "hot" — the
// cards would flash red/💀 in the gap between tram data and weather data
// arriving. Use the sub-22 °C cap (2).
const UNKNOWN_TEMP_MAX_SEVERITY = 2;

function maxSeverityForTemp(temp: number | null): number {
  if (temp === null) return UNKNOWN_TEMP_MAX_SEVERITY;
  // Callers short-circuit before COOL_CUTOFF_C, so the tier always has maxSeverity.
  return tierFor(temp).maxSeverity as number;
}

function levelFor(percentage: number, temp: number | null): ACLevel {
  const raw =
    AC_LEVELS.find((l) => percentage >= l.minPercentage) ?? AC_LEVELS[AC_LEVELS.length - 1];
  const cap = maxSeverityForTemp(temp);
  if (raw.severity <= cap) return raw;
  // cap comes from TemperatureTier.maxSeverity, which is always a key in LEVEL_BY_SEVERITY.
  return LEVEL_BY_SEVERITY.get(cap) as ACLevel;
}

const NEUTRAL_LIGHT = "rgb(229 231 235)";
const NEUTRAL_DARK = "rgb(55 65 81)";

export function getACEmoji(percentage: number, temp: number | null): string {
  if (temp !== null && temp < COOL_CUTOFF_C) return "🚋";
  return levelFor(percentage, temp).emoji;
}

export function getACBackgroundColor(
  percentage: number,
  temp: number | null,
  isDark: boolean,
): string {
  if (temp !== null && temp < COOL_CUTOFF_C) return isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const level = levelFor(percentage, temp);
  return isDark ? level.darkColor : level.lightColor;
}
