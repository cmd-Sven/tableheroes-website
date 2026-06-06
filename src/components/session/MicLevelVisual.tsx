"use client";

type Props = {
  levels: number[];
  active?: boolean;
  compact?: boolean;
  /** Gold (Standard), Rot (Live-Aufnahme) oder Emerald (Monitor-Widget). */
  variant?: "default" | "recording" | "monitor";
  peakLevel?: number;
  className?: string;
};

function barColor(variant: Props["variant"], active: boolean, level: number): string {
  if (!active) return "bg-gray-600/50";
  if (variant === "recording") {
    return level > 0.45
      ? "bg-red-400"
      : level > 0.15
        ? "bg-red-500/90"
        : "bg-red-700/80";
  }
  if (variant === "monitor") {
    return level > 0.45
      ? "bg-emerald-300"
      : level > 0.12
        ? "bg-emerald-500/90"
        : "bg-emerald-800/70";
  }
  return "bg-accent-gold/85";
}

export function MicLevelVisual({
  levels,
  active = true,
  compact = false,
  variant = "default",
  peakLevel,
  className = "",
}: Props) {
  const height = compact ? 32 : variant === "monitor" ? 48 : 64;
  const barWidth = compact ? 3 : variant === "monitor" ? 4 : 6;

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div
        className="flex items-end justify-center gap-px px-0.5"
        style={{ height: `${height}px` }}
        aria-hidden
      >
        {levels.map((level, i) => (
          <div
            key={i}
            className={`rounded-sm transition-[height] duration-75 ${barColor(variant, active, level)}`}
            style={{
              width: `${barWidth}px`,
              height: `${Math.max(compact ? 3 : 4, Math.round(level * (height - 4)))}px`,
              opacity: active ? 0.4 + level * 0.6 : 0.25,
            }}
          />
        ))}
      </div>
      {peakLevel != null && active ? (
        <div
          className="h-1 overflow-hidden rounded-full bg-black/40"
          aria-hidden
        >
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${
              variant === "recording"
                ? "bg-red-400"
                : variant === "monitor"
                  ? "bg-emerald-400"
                  : "bg-accent-gold"
            }`}
            style={{ width: `${Math.min(100, Math.round(peakLevel * 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

type SignalBadgeProps = {
  hasSignal: boolean;
  isActive: boolean;
  deviceLabel?: string | null;
  compact?: boolean;
};

export function MicSignalBadge({
  hasSignal,
  isActive,
  deviceLabel,
  compact = false,
}: SignalBadgeProps) {
  if (!isActive) {
    return (
      <span className="font-libre text-[10px] text-gray-500">
        Mikrofon nicht aktiv
      </span>
    );
  }

  return (
    <div className={`flex flex-col gap-0.5 ${compact ? "min-w-0" : ""}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-barlow font-bold uppercase ${
          compact ? "text-[9px]" : "text-[10px]"
        } ${
          hasSignal
            ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-300"
            : "border-amber-600/50 bg-amber-950/40 text-amber-200"
        }`}
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            hasSignal ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`}
        />
        {hasSignal ? "Signal OK" : "Sprich ins Mikro…"}
      </span>
      {deviceLabel && !compact ? (
        <span className="truncate font-libre text-[10px] text-gray-500" title={deviceLabel}>
          {deviceLabel}
        </span>
      ) : null}
    </div>
  );
}
