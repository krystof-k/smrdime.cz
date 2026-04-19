import { getACBackgroundColor, getACEmoji } from "@/lib/display";
import { roundPercent } from "@/lib/ratios";
import type { TramLineInfo } from "@/lib/tram-analysis";

type TramLineCardProps = {
  line: TramLineInfo;
  temperature: number | null;
  isDark: boolean;
  showPercentages: boolean;
};

export function TramLineCard({ line, temperature, isDark, showPercentages }: TramLineCardProps) {
  const acPercentage = roundPercent(line.vehiclesWithAC, line.totalVehicles);
  const background = getACBackgroundColor(acPercentage, temperature, isDark);
  const emoji = getACEmoji(acPercentage, temperature);
  const ratio = showPercentages
    ? `${acPercentage}\u00A0%`
    : `${line.vehiclesWithAC}/${line.totalVehicles}`;

  return (
    <div
      className="h-16 w-40 shrink-0 rounded-2xl p-3 backdrop-blur-sm"
      style={{ backgroundColor: background }}
    >
      <div className="grid h-full w-full grid-cols-3 items-center gap-1">
        <div className="text-center text-2xl">{emoji}</div>
        <div className="text-center font-black font-mono text-xl text-gray-800 dark:text-gray-100">
          {line.lineNumber}
        </div>
        <div className="text-right font-mono text-gray-700 text-sm dark:text-gray-200">{ratio}</div>
      </div>
    </div>
  );
}
