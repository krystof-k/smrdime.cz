"use client";

import { cloneElement, useEffect, useId, useState } from "react";
import { VehicleStatusView } from "@/components/VehicleStatusView";
import { AC_LEVELS, COOL_CUTOFF_C, TEMPERATURE_TIERS } from "@/lib/display";
import type { LineInfo, VehicleAnalysisResult } from "@/lib/vehicle-analysis";
import type { VehicleMode } from "@/lib/vehicle-modes";

type DebugState = {
  mode: VehicleMode;
  temperature: number | null;
  totalVehicles: number;
  vehiclesWithAC: number;
  lineCount: number;
  loading: boolean;
  error: string;
  isDark: boolean;
};

type Preset = {
  label: string;
  state: DebugState;
};

const DEFAULT_STATE: DebugState = {
  mode: "tram",
  temperature: 28,
  totalVehicles: 120,
  vehiclesWithAC: 40,
  lineCount: 9,
  loading: false,
  error: "",
  isDark: false,
};

const PRESETS: Preset[] = [
  {
    label: "Extrémní vedro (40 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 40,
      totalVehicles: 150,
      vehiclesWithAC: 15,
    },
  },
  {
    label: "Horko (32 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 32,
      totalVehicles: 140,
      vehiclesWithAC: 40,
    },
  },
  {
    label: "Teplo (25 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 25,
      totalVehicles: 120,
      vehiclesWithAC: 60,
    },
  },
  {
    label: "Mírně (18 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 18,
      totalVehicles: 100,
      vehiclesWithAC: 50,
    },
  },
  {
    label: "Chladno (8 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 8,
      totalVehicles: 90,
      vehiclesWithAC: 45,
    },
  },
  {
    label: "Mráz (−5 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: -5,
      totalVehicles: 80,
      vehiclesWithAC: 40,
    },
  },
  {
    label: "Žádný AC (30 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 30,
      totalVehicles: 120,
      vehiclesWithAC: 0,
    },
  },
  {
    label: "Všechno AC (30 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 30,
      totalVehicles: 100,
      vehiclesWithAC: 100,
    },
  },
  {
    label: "Loading",
    state: { ...DEFAULT_STATE, loading: true },
  },
  {
    label: "Error",
    state: { ...DEFAULT_STATE, error: "Failed to fetch vehicle status" },
  },
  {
    label: "Prázdno (0 vozidel)",
    state: { ...DEFAULT_STATE, totalVehicles: 0, vehiclesWithAC: 0 },
  },
  {
    label: "Bez počasí",
    state: { ...DEFAULT_STATE, temperature: null },
  },
];

const LINE_NUMBERS: Record<VehicleMode, string[]> = {
  tram: [
    "1",
    "2",
    "3",
    "5",
    "6",
    "7",
    "9",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "20",
    "22",
    "24",
    "25",
    "26",
    "92",
  ],
  bus: [
    "100",
    "112",
    "119",
    "125",
    "131",
    "136",
    "140",
    "147",
    "162",
    "174",
    "177",
    "180",
    "191",
    "200",
    "207",
    "213",
    "215",
    "250",
    "296",
    "907",
    "911",
  ],
};

function generateLineDetails(
  lineNumbers: string[],
  totalVehicles: number,
  vehiclesWithAC: number,
  lineCount: number,
): LineInfo[] {
  const count = Math.max(0, Math.min(lineCount, lineNumbers.length));
  if (count === 0 || totalVehicles === 0) return [];

  const lines: LineInfo[] = [];
  let remainingTotal = totalVehicles;
  let remainingAC = vehiclesWithAC;
  const overallRatio = totalVehicles > 0 ? vehiclesWithAC / totalVehicles : 0;

  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const linesLeft = count - i;
    const perLine = Math.max(1, Math.round(remainingTotal / linesLeft));
    const total = isLast ? remainingTotal : Math.min(perLine, remainingTotal);

    // Vary AC ratio per line a bit (±20%) but clamp to remaining budget
    const jitter = (((i * 7919) % 100) / 100 - 0.5) * 0.4;
    const targetRatio = Math.max(0, Math.min(1, overallRatio + jitter));
    const wantAC = Math.round(total * targetRatio);
    const withAC = isLast ? remainingAC : Math.min(wantAC, remainingAC, total);

    lines.push({
      lineNumber: lineNumbers[i],
      routeId: `route-${lineNumbers[i]}`,
      totalVehicles: total,
      vehiclesWithAC: withAC,
      vehiclesWithoutAC: total - withAC,
    });

    remainingTotal -= total;
    remainingAC -= withAC;
  }

  return lines;
}

function buildAnalysisResult(state: DebugState): VehicleAnalysisResult {
  const withAC = Math.max(0, Math.min(state.vehiclesWithAC, state.totalVehicles));
  const withoutAC = state.totalVehicles - withAC;
  const counts = {
    totalVehicles: state.totalVehicles,
    vehiclesWithAC: withAC,
    vehiclesWithoutAC: withoutAC,
    lineDetails: generateLineDetails(
      LINE_NUMBERS[state.mode],
      state.totalVehicles,
      withAC,
      state.lineCount,
    ),
  };
  // Debug sliders drive one set of numbers; the layover toggle just shows the
  // same counts in both modes.
  return { onTrack: counts, inService: counts, lastUpdated: new Date() };
}

export function DebugClient() {
  const [state, setState] = useState<DebugState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const set = <K extends keyof DebugState>(key: K, value: DebugState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const data = state.loading || state.error ? null : buildAnalysisResult(state);
  const noop = () => {};

  const withoutAC = Math.max(0, state.totalVehicles - state.vehiclesWithAC);
  const maxLines = LINE_NUMBERS[state.mode].length;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="sticky top-0 z-40 border-gray-200 border-b bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h1 className="font-black text-2xl text-gray-900 dark:text-gray-100">
              /debug
              <span className="ml-2 font-normal text-gray-500 text-sm dark:text-gray-400">
                živý náhled rendrování
              </span>
            </h1>
            <button
              type="button"
              onClick={() => setState(DEFAULT_STATE)}
              className="rounded-md bg-gray-200 px-3 py-1 font-mono text-gray-700 text-xs hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              reset
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Field label="Vozidla">
                <select
                  value={state.mode}
                  onChange={(event) => set("mode", event.target.value as VehicleMode)}
                  className={inputClass}
                >
                  <option value="tram">Tramvaje 🚋</option>
                  <option value="bus">Autobusy 🚌</option>
                </select>
              </Field>
              <Field label="Teplota (°C)">
                <input
                  type="number"
                  value={state.temperature ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    set("temperature", raw === "" ? null : Number(raw));
                  }}
                  className={inputClass}
                />
              </Field>
              <Field label="Celkem vozidel na trati">
                <input
                  type="number"
                  min={0}
                  value={state.totalVehicles}
                  onChange={(event) =>
                    set("totalVehicles", Math.max(0, Number(event.target.value)))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Z toho s AC">
                <input
                  type="number"
                  min={0}
                  max={state.totalVehicles}
                  onChange={(event) =>
                    set(
                      "vehiclesWithAC",
                      Math.max(0, Math.min(state.totalVehicles, Number(event.target.value))),
                    )
                  }
                  value={state.vehiclesWithAC}
                  className={inputClass}
                />
              </Field>
              <Field label="Bez AC (odvozené)">
                <input
                  type="number"
                  value={withoutAC}
                  readOnly
                  className={`${inputClass} text-gray-500 dark:text-gray-400`}
                />
              </Field>
              <Field label="Počet linek">
                <input
                  type="number"
                  min={0}
                  max={maxLines}
                  value={state.lineCount}
                  onChange={(event) =>
                    set("lineCount", Math.max(0, Math.min(maxLines, Number(event.target.value))))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Chybová hláška">
                <input
                  type="text"
                  placeholder="(prázdné = bez chyby)"
                  value={state.error}
                  onChange={(event) => set("error", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Toggle
                label="Loading"
                checked={state.loading}
                onChange={(checked) => set("loading", checked)}
              />
              <Toggle
                label="Dark mode"
                checked={state.isDark}
                onChange={(checked) => set("isDark", checked)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                // Presets describe weather/data scenarios; keep whichever
                // vehicle mode is currently selected.
                onClick={() => setState((prev) => ({ ...preset.state, mode: prev.mode }))}
                className="rounded-md bg-gray-100 px-3 py-1 font-mono text-gray-700 text-xs hover:bg-sky-100 hover:text-sky-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-sky-950 dark:hover:text-sky-300"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Thresholds />
        </div>
      </div>

      <div data-theme={state.isDark ? "dark" : "light"}>
        <VehicleStatusView
          mode={state.mode}
          data={data}
          error={state.error || null}
          lastUpdated={mounted && data ? new Date() : null}
          paused={false}
          onTogglePaused={noop}
          temperature={state.temperature}
          isDark={state.isDark}
          onRetry={noop}
        />
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-gray-900 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-medium text-gray-700 text-xs dark:text-gray-300">{label}</span>
      {cloneElement(children, { id })}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 pt-5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-gray-300"
      />
      <span className="font-medium text-gray-700 text-xs dark:text-gray-300">{label}</span>
    </label>
  );
}

function formatTemp(minTemp: number): string {
  if (minTemp === Number.NEGATIVE_INFINITY) return "< 0";
  return `≥ ${minTemp}`;
}

function Thresholds() {
  return (
    <details className="mt-4 rounded-md border border-gray-200 dark:border-gray-800">
      <summary className="cursor-pointer px-3 py-2 font-medium text-gray-700 text-sm dark:text-gray-300">
        Rendrovací prahy{" "}
        <span className="font-normal text-gray-500 text-xs dark:text-gray-400">
          (zdroj: <span className="font-mono">src/lib/display.ts</span>)
        </span>
      </summary>
      <div className="grid gap-4 p-3 md:grid-cols-3">
        <section>
          <h2 className="mb-2 font-semibold text-gray-700 text-xs uppercase tracking-wide dark:text-gray-300">
            Teplota → barva + emoji
          </h2>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="text-left">°C</th>
                <th className="text-left">emoji</th>
                <th className="text-left">class</th>
              </tr>
            </thead>
            <tbody>
              {TEMPERATURE_TIERS.map((tier) => (
                <tr key={tier.minTemp} className="border-gray-100 border-t dark:border-gray-800">
                  <td className="py-1 text-gray-700 dark:text-gray-300">
                    {formatTemp(tier.minTemp)}
                  </td>
                  <td className="py-1">{tier.emoji}</td>
                  <td className={`py-1 ${tier.textColor}`}>■ text</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-700 text-xs uppercase tracking-wide dark:text-gray-300">
            AC % → karta linky
          </h2>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="text-left">%</th>
                <th className="text-left">emoji</th>
                <th className="text-left">severity</th>
              </tr>
            </thead>
            <tbody>
              {AC_LEVELS.map((level) => (
                <tr
                  key={level.minPercentage}
                  className="border-gray-100 border-t dark:border-gray-800"
                >
                  <td className="py-1 text-gray-700 dark:text-gray-300">≥ {level.minPercentage}</td>
                  <td className="py-1">{level.emoji}</td>
                  <td className="py-1 text-gray-500 dark:text-gray-400">{level.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-700 text-xs uppercase tracking-wide dark:text-gray-300">
            Teplota → strop severity
          </h2>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400">
                <th className="text-left">°C</th>
                <th className="text-left">max. severity</th>
              </tr>
            </thead>
            <tbody>
              {TEMPERATURE_TIERS.map((tier) => (
                <tr key={tier.minTemp} className="border-gray-100 border-t dark:border-gray-800">
                  <td className="py-1 text-gray-700 dark:text-gray-300">
                    {formatTemp(tier.minTemp)}
                  </td>
                  <td className="py-1 text-gray-500 dark:text-gray-400">
                    {tier.maxSeverity ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-gray-600 text-xs dark:text-gray-400">
            Pod <span className="font-mono">{COOL_CUTOFF_C} °C</span> karta linky přepne na
            neutrální šedou a emoji na 🚋/🚌.
          </p>
        </section>
      </div>
    </details>
  );
}
