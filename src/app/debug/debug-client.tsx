"use client";

import { cloneElement, useEffect, useId, useState } from "react";
import { DashboardView } from "@/components/DashboardView";
import type { LineInfo, VehicleAnalysisResult } from "@/lib/analysis";
import { AC_LEVELS, COOL_CUTOFF_C, TEMPERATURE_TIERS } from "@/lib/display";

type DebugState = {
  temperature: number | null;
  totalTrams: number;
  tramsWithAC: number;
  tramLineCount: number;
  tramLoading: boolean;
  tramError: string;
  totalBuses: number;
  busesWithAC: number;
  busLineCount: number;
  busLoading: boolean;
  busError: string;
  isDark: boolean;
};

type Preset = {
  label: string;
  state: DebugState;
};

const DEFAULT_STATE: DebugState = {
  temperature: 28,
  totalTrams: 120,
  tramsWithAC: 40,
  tramLineCount: 9,
  tramLoading: false,
  tramError: "",
  totalBuses: 280,
  busesWithAC: 180,
  busLineCount: 12,
  busLoading: false,
  busError: "",
  isDark: false,
};

const PRESETS: Preset[] = [
  {
    label: "Extrémní vedro (40 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 40,
      totalTrams: 150,
      tramsWithAC: 15,
      totalBuses: 300,
      busesWithAC: 120,
    },
  },
  {
    label: "Horko (32 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 32,
      totalTrams: 140,
      tramsWithAC: 40,
      totalBuses: 290,
      busesWithAC: 160,
    },
  },
  {
    label: "Teplo (25 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 25,
      totalTrams: 120,
      tramsWithAC: 60,
      totalBuses: 270,
      busesWithAC: 200,
    },
  },
  {
    label: "Mírně (18 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 18,
      totalTrams: 100,
      tramsWithAC: 50,
      totalBuses: 240,
      busesWithAC: 170,
    },
  },
  {
    label: "Chladno (8 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 8,
      totalTrams: 90,
      tramsWithAC: 45,
      totalBuses: 220,
      busesWithAC: 150,
    },
  },
  {
    label: "Mráz (−5 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: -5,
      totalTrams: 80,
      tramsWithAC: 40,
      totalBuses: 200,
      busesWithAC: 130,
    },
  },
  {
    label: "Žádný AC (30 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 30,
      totalTrams: 120,
      tramsWithAC: 0,
      totalBuses: 280,
      busesWithAC: 0,
    },
  },
  {
    label: "Všechno AC (30 °C)",
    state: {
      ...DEFAULT_STATE,
      temperature: 30,
      totalTrams: 100,
      tramsWithAC: 100,
      totalBuses: 260,
      busesWithAC: 260,
    },
  },
  {
    label: "Loading",
    state: { ...DEFAULT_STATE, tramLoading: true, busLoading: true },
  },
  {
    label: "Error (oboje)",
    state: {
      ...DEFAULT_STATE,
      tramError: "Failed to fetch tram status",
      busError: "Failed to fetch bus status",
    },
  },
  {
    label: "Jen autobusy padly",
    state: {
      ...DEFAULT_STATE,
      busError: "Failed to fetch bus status",
    },
  },
  {
    label: "Jen tramvaje padly",
    state: {
      ...DEFAULT_STATE,
      tramError: "Failed to fetch tram status",
    },
  },
  {
    label: "Prázdno (0 vozů)",
    state: {
      ...DEFAULT_STATE,
      totalTrams: 0,
      tramsWithAC: 0,
      totalBuses: 0,
      busesWithAC: 0,
    },
  },
  {
    label: "Bez počasí",
    state: { ...DEFAULT_STATE, temperature: null },
  },
];

const TRAM_LINE_NUMBERS = [
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
];

const BUS_LINE_NUMBERS = [
  "100",
  "101",
  "112",
  "119",
  "124",
  "131",
  "136",
  "139",
  "140",
  "142",
  "149",
  "154",
  "159",
  "177",
  "191",
  "201",
  "213",
  "907",
  "908",
  "909",
  "910",
];

function generateLineDetails(
  total: number,
  withAC: number,
  lineCount: number,
  lineNumbers: readonly string[],
): LineInfo[] {
  const count = Math.max(0, Math.min(lineCount, lineNumbers.length));
  if (count === 0 || total === 0) return [];

  const lines: LineInfo[] = [];
  let remainingTotal = total;
  let remainingAC = withAC;
  const overallRatio = total > 0 ? withAC / total : 0;

  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const linesLeft = count - i;
    const perLine = Math.max(1, Math.round(remainingTotal / linesLeft));
    const lineTotal = isLast ? remainingTotal : Math.min(perLine, remainingTotal);

    // Vary AC ratio per line a bit (±20%) but clamp to remaining budget
    const jitter = (((i * 7919) % 100) / 100 - 0.5) * 0.4;
    const targetRatio = Math.max(0, Math.min(1, overallRatio + jitter));
    const wantAC = Math.round(lineTotal * targetRatio);
    const lineWithAC = isLast ? remainingAC : Math.min(wantAC, remainingAC, lineTotal);

    lines.push({
      lineNumber: lineNumbers[i],
      routeId: `route-${lineNumbers[i]}`,
      totalVehicles: lineTotal,
      vehiclesWithAC: lineWithAC,
      vehiclesWithoutAC: lineTotal - lineWithAC,
      status: "completed",
    });

    remainingTotal -= lineTotal;
    remainingAC -= lineWithAC;
  }

  return lines;
}

type VehicleSlice = {
  total: number;
  withAC: number;
  lineCount: number;
  loading: boolean;
  error: string;
};

function sliceFromState(state: DebugState, kind: "tram" | "bus"): VehicleSlice {
  if (kind === "tram") {
    return {
      total: state.totalTrams,
      withAC: state.tramsWithAC,
      lineCount: state.tramLineCount,
      loading: state.tramLoading,
      error: state.tramError,
    };
  }
  return {
    total: state.totalBuses,
    withAC: state.busesWithAC,
    lineCount: state.busLineCount,
    loading: state.busLoading,
    error: state.busError,
  };
}

function buildAnalysisResult(
  slice: VehicleSlice,
  lineNumbers: readonly string[],
): VehicleAnalysisResult {
  const withAC = Math.max(0, Math.min(slice.withAC, slice.total));
  const withoutAC = slice.total - withAC;
  return {
    totalVehicles: slice.total,
    vehiclesWithAC: withAC,
    vehiclesWithoutAC: withoutAC,
    lastUpdated: new Date(),
    lineDetails: generateLineDetails(slice.total, withAC, slice.lineCount, lineNumbers),
  };
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

  const tramSlice = sliceFromState(state, "tram");
  const busSlice = sliceFromState(state, "bus");
  const tramData =
    tramSlice.loading || tramSlice.error ? null : buildAnalysisResult(tramSlice, TRAM_LINE_NUMBERS);
  const busData =
    busSlice.loading || busSlice.error ? null : buildAnalysisResult(busSlice, BUS_LINE_NUMBERS);
  const noop = () => {};

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

          <div className="grid gap-4">
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

            <VehicleInputs
              title="Tramvaje 🚋"
              total={state.totalTrams}
              withAC={state.tramsWithAC}
              lineCount={state.tramLineCount}
              lineCountMax={TRAM_LINE_NUMBERS.length}
              loading={state.tramLoading}
              error={state.tramError}
              onTotal={(value) => {
                set("totalTrams", Math.max(0, value));
                if (state.tramsWithAC > value) set("tramsWithAC", Math.max(0, value));
              }}
              onWithAC={(value) =>
                set("tramsWithAC", Math.max(0, Math.min(state.totalTrams, value)))
              }
              onLineCount={(value) =>
                set("tramLineCount", Math.max(0, Math.min(TRAM_LINE_NUMBERS.length, value)))
              }
              onLoading={(checked) => set("tramLoading", checked)}
              onError={(value) => set("tramError", value)}
            />

            <VehicleInputs
              title="Autobusy 🚌"
              total={state.totalBuses}
              withAC={state.busesWithAC}
              lineCount={state.busLineCount}
              lineCountMax={BUS_LINE_NUMBERS.length}
              loading={state.busLoading}
              error={state.busError}
              onTotal={(value) => {
                set("totalBuses", Math.max(0, value));
                if (state.busesWithAC > value) set("busesWithAC", Math.max(0, value));
              }}
              onWithAC={(value) =>
                set("busesWithAC", Math.max(0, Math.min(state.totalBuses, value)))
              }
              onLineCount={(value) =>
                set("busLineCount", Math.max(0, Math.min(BUS_LINE_NUMBERS.length, value)))
              }
              onLoading={(checked) => set("busLoading", checked)}
              onError={(value) => set("busError", value)}
            />

            <Toggle
              label="Dark mode"
              checked={state.isDark}
              onChange={(checked) => set("isDark", checked)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setState(preset.state)}
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
        <DashboardView
          tramData={tramData}
          tramError={state.tramError || null}
          onTramRetry={noop}
          busData={busData}
          busError={state.busError || null}
          onBusRetry={noop}
          lastUpdated={mounted && (tramData || busData) ? new Date() : null}
          paused={false}
          onTogglePaused={noop}
          temperature={state.temperature}
          isDark={state.isDark}
        />
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-gray-900 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

type VehicleInputsProps = {
  title: string;
  total: number;
  withAC: number;
  lineCount: number;
  lineCountMax: number;
  loading: boolean;
  error: string;
  onTotal: (value: number) => void;
  onWithAC: (value: number) => void;
  onLineCount: (value: number) => void;
  onLoading: (checked: boolean) => void;
  onError: (value: string) => void;
};

function VehicleInputs({
  title,
  total,
  withAC,
  lineCount,
  lineCountMax,
  loading,
  error,
  onTotal,
  onWithAC,
  onLineCount,
  onLoading,
  onError,
}: VehicleInputsProps) {
  const withoutAC = Math.max(0, total - withAC);
  return (
    <fieldset className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
      <legend className="px-1 font-semibold text-gray-700 text-xs dark:text-gray-300">
        {title}
      </legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Celkem na trati">
          <input
            type="number"
            min={0}
            value={total}
            onChange={(event) => onTotal(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Z toho s AC">
          <input
            type="number"
            min={0}
            max={total}
            value={withAC}
            onChange={(event) => onWithAC(Number(event.target.value))}
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
            max={lineCountMax}
            value={lineCount}
            onChange={(event) => onLineCount(Number(event.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Chybová hláška">
          <input
            type="text"
            placeholder="(prázdné = bez chyby)"
            value={error}
            onChange={(event) => onError(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Toggle label="Loading" checked={loading} onChange={onLoading} />
      </div>
    </fieldset>
  );
}

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
            neutrální šedou a emoji na odpovídající vozidlo (🚋 / 🚌).
          </p>
        </section>
      </div>
    </details>
  );
}
