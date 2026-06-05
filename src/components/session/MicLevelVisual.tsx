"use client";

type Props = {
  levels: number[];
  active?: boolean;
  compact?: boolean;
  className?: string;
};

export function MicLevelVisual({
  levels,
  active = true,
  compact = false,
  className = "",
}: Props) {
  const height = compact ? 32 : 64;
  return (
    <div
      className={`flex items-end justify-center gap-0.5 px-1 ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden
    >
      {levels.map((level, i) => (
        <div
          key={i}
          className={`rounded-sm transition-[height] duration-75 ${
            active ? "bg-accent-gold/85" : "bg-gray-600/50"
          }`}
          style={{
            width: compact ? "3px" : "6px",
            height: `${Math.max(compact ? 3 : 4, Math.round(level * (height - 4)))}px`,
            opacity: active ? 0.35 + level * 0.65 : 0.25,
          }}
        />
      ))}
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
