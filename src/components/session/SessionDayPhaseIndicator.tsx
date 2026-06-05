import {
  SESSION_DAY_PHASE_META,
  type SessionDayPhase,
} from "@/src/lib/session-day-phase";

type Props = {
  phase: SessionDayPhase;
  className?: string;
};

/** Grobe Tageszeit-Orientierung für Spieler am Bühnenrand. */
export function SessionDayPhaseIndicator({ phase, className = "" }: Props) {
  const { label, Icon, iconClassName } = SESSION_DAY_PHASE_META[phase];

  return (
    <div
      className={`pointer-events-none flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-black/50 px-2.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-3 sm:py-3 ${className}`}
      title={`Tageszeit: ${label}`}
      aria-label={`Tageszeit: ${label}`}
    >
      <Icon
        className={`h-9 w-9 drop-shadow-[0_0_14px_rgba(255,255,255,0.2)] sm:h-11 sm:w-11 ${iconClassName}`}
        strokeWidth={1.65}
        aria-hidden
      />
      <span className="hidden max-w-[5.5rem] text-center font-barlow text-[8px] font-bold uppercase leading-tight tracking-wide text-gray-200/90 min-[420px]:block">
        {label}
      </span>
    </div>
  );
}
