import type { DndCoinCode } from "@/src/lib/dnd-currency";
import {
  coinPouchToDisplayParts,
  copperToDisplayParts,
  formatCoinPouch,
  formatCopper,
  normalizeCoinPouch,
  type CoinPouch,
} from "@/src/lib/dnd-currency";

export const DND_COIN_ICON_STYLES: Record<
  DndCoinCode,
  { ring: string; fill: string; name: string }
> = {
  cp: {
    name: "Kupfermünzen",
    ring: "border-orange-900/80",
    fill: "bg-linear-to-br from-orange-300 via-amber-700 to-orange-950",
  },
  sp: {
    name: "Silbermünzen",
    ring: "border-slate-400/80",
    fill: "bg-linear-to-br from-slate-100 via-slate-300 to-slate-500",
  },
  ep: {
    name: "Elektrummünzen",
    ring: "border-teal-700/70",
    fill: "bg-linear-to-br from-teal-100 via-emerald-300 to-teal-700",
  },
  gp: {
    name: "Goldmünzen",
    ring: "border-amber-500/80",
    fill: "bg-linear-to-br from-yellow-200 via-amber-400 to-yellow-700",
  },
  pp: {
    name: "Platinmünzen",
    ring: "border-sky-300/70",
    fill: "bg-linear-to-br from-slate-50 via-sky-200 to-slate-400",
  },
};

const ICON_SIZE_PX = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
} as const;

type IconSize = keyof typeof ICON_SIZE_PX;

export function DndCoinIcon({
  code,
  size = "sm",
  className = "",
}: {
  code: DndCoinCode;
  size?: IconSize;
  className?: string;
}) {
  const meta = DND_COIN_ICON_STYLES[code];
  const px = ICON_SIZE_PX[size];

  return (
    <span
      className={`inline-block shrink-0 rounded-full border shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.35)] ${meta.ring} ${meta.fill} ${className}`}
      style={{ width: px, height: px }}
      title={meta.name}
      aria-hidden
    />
  );
}

type DisplayProps = {
  pouch?: Partial<CoinPouch>;
  totalCp?: number;
  size?: IconSize;
  className?: string;
  amountClassName?: string;
  /** Bei leerem Beutel: 0 + Kupfer-Icon */
  showEmpty?: boolean;
};

export function DndCoinDisplay({
  pouch,
  totalCp,
  size = "sm",
  className = "",
  amountClassName = "font-barlow text-xs font-bold tabular-nums text-accent-gold",
  showEmpty = true,
}: DisplayProps) {
  const parts =
    totalCp != null
      ? copperToDisplayParts(totalCp)
      : coinPouchToDisplayParts(pouch ?? {});

  const ariaLabel =
    totalCp != null
      ? formatCopper(totalCp)
      : formatCoinPouch(pouch ?? {});

  if (parts.length === 0) {
    if (!showEmpty) {
      return <span className={className} aria-label={ariaLabel}>—</span>;
    }
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        aria-label={ariaLabel}
      >
        <span className={amountClassName}>0</span>
        <DndCoinIcon code="cp" size={size} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}
      aria-label={ariaLabel}
    >
      {parts.map((part) => (
        <span key={part.code} className="inline-flex items-center gap-1">
          <span className={amountClassName}>{part.amount.toLocaleString("de-DE")}</span>
          <DndCoinIcon code={part.code} size={size} />
        </span>
      ))}
    </span>
  );
}

export function DndCoinDisplayFromPouch(props: Omit<DisplayProps, "totalCp"> & { pouch: Partial<CoinPouch> }) {
  return <DndCoinDisplay {...props} />;
}

/** Kompakte Zeile aller Münzarten (auch 0) für Charakter-Beutel. */
export function DndCoinWalletRow({
  pouch,
  className = "",
}: {
  pouch: Partial<CoinPouch>;
  className?: string;
}) {
  const normalized = normalizeCoinPouch(pouch);
  const codes: DndCoinCode[] = ["pp", "gp", "ep", "sp", "cp"];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`} aria-label={formatCoinPouch(normalized)}>
      {codes.map((code) => (
        <span
          key={code}
          className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-black/25 px-2 py-1"
          title={DND_COIN_ICON_STYLES[code].name}
        >
          <DndCoinIcon code={code} size="sm" />
          <span className="font-barlow text-xs font-bold tabular-nums text-accent-gold">
            {normalized[code].toLocaleString("de-DE")}
          </span>
        </span>
      ))}
    </div>
  );
}
