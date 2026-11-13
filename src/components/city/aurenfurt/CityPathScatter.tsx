"use client";

/**
 * Connected Scatter: Kriminalität × Wirtschaft als abspielbarer Monatspfad.
 * Zukunft bleibt unsichtbar — der Trail zeichnet sich erst mit der Zeit.
 */

import { Pause, Play, RotateCcw } from "lucide-react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  buildLongTermMonthlySeries,
  longTermPathMarkers,
  type LongTermMonthPoint,
} from "./aurenfurt-analytics";
import { HISTORY_START } from "./aurenfurt-history";
import { formatKassadrasMonthYear } from "@/src/lib/world/kassadras-calendar";

type Props = {
  day: string;
  scopeId: CityDistrictId | null;
  scopeLabel: string;
  /** Fertige Serie von CityLongTermOverview — vermeidet Doppelrechnung. */
  series?: LongTermMonthPoint[];
};

type PathPoint = {
  crime: number;
  economy: number;
  label: string;
  day: string;
  index: number;
  kind: "path" | "event" | "start" | "now" | "year" | "head";
  title?: string;
};

type PlotPoint = { x: number; y: number };

/** Pro Monat — langsam genug, dass das Auge dem Kopf folgen kann (~20–40 s für ~39 Monate). */
const SPEED_MS = { "0.5x": 900, "1x": 520, "2x": 280 } as const;
type SpeedKey = keyof typeof SPEED_MS;

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PathTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PathPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  const headline =
    point.kind === "event"
      ? point.title
      : point.kind === "start"
        ? `Start · ${point.label}`
        : point.kind === "head" || point.kind === "now"
          ? `Abspielstand · ${point.label}`
          : point.kind === "year"
            ? `Jahreswechsel · ${point.label}`
            : point.label;
  return (
    <div className="rounded-md border border-hero-border/70 bg-background-card px-3 py-2 shadow-xl">
      <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
        {headline}
      </p>
      {point.kind === "event" ? (
        <p className="font-libre text-xs text-gray-300">{point.label}</p>
      ) : null}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Kriminalität
          </p>
          <p className="font-barlow text-lg font-extrabold tabular-nums text-white">
            {Math.round(point.crime)}
          </p>
        </div>
        <div>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Wirtschaft
          </p>
          <p className="font-barlow text-lg font-extrabold tabular-nums text-white">
            {Math.round(point.economy)}
          </p>
        </div>
      </div>
    </div>
  );
}

function lerpColor(a: string, b: string, t: number) {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(ar, br))}${toHex(mix(ag, bg))}${toHex(mix(ab, bb))}`;
}

function timeStroke(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) return lerpColor("#7dd3fc", "#379806", clamped * 2);
  return lerpColor("#379806", "#cab926", (clamped - 0.5) * 2);
}

function paddedDomain(values: number[], fallback: [number, number] = [0, 100]): [number, number] {
  if (values.length === 0) return fallback;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(8, max - min);
  const pad = span * 0.22;
  const lo = Math.max(0, Math.floor(min - pad));
  const hi = Math.min(100, Math.ceil(max + pad));
  if (hi - lo < 14) {
    const mid = (lo + hi) / 2;
    return [Math.max(0, Math.floor(mid - 7)), Math.min(100, Math.ceil(mid + 7))];
  }
  return [lo, hi];
}

type PathLineProps = {
  points?: Array<{ x?: number | null; y?: number | null }>;
  totalMonths: number;
};

/** Sichtbarer Trail bis zum Kopf — Zukunft wird nicht gezeichnet. */
function GradientTimePath({ points, totalMonths }: PathLineProps) {
  const plot = (points ?? []).filter(
    (point): point is PlotPoint =>
      typeof point.x === "number" &&
      typeof point.y === "number" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y),
  );
  if (plot.length < 2) return null;

  const start = plot[0];
  const end = plot[plot.length - 1];
  const poly = plot.map((point) => `${point.x},${point.y}`).join(" ");
  const lastSeg = Math.max(1, plot.length - 2);

  return (
    <g className="city-path-gradient" aria-hidden>
      <polyline
        fill="none"
        points={poly}
        stroke="#04140a"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="#ffffff33"
        strokeWidth={1.5}
        strokeDasharray="5 5"
      />
      {plot.slice(0, -1).map((from, index) => {
        const to = plot[index + 1];
        const t = index / Math.max(1, totalMonths - 2);
        // Ghost-Trail: ältere Segmente blasser, Kopf-Nähe kräftig
        const age = index / lastSeg;
        const opacity = 0.28 + age * 0.72;
        return (
          <line
            key={`seg-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={timeStroke(t)}
            strokeWidth={3.25}
            strokeLinecap="round"
            opacity={opacity}
          />
        );
      })}
      <DriftArrow from={plot[Math.max(0, plot.length - 3)]} to={end} />
    </g>
  );
}

function DriftArrow({ from, to }: { from: PlotPoint; to: PlotPoint }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  if (len < 8) return null;
  const ux = dx / len;
  const uy = dy / len;
  const size = 7;
  const tipX = to.x;
  const tipY = to.y;
  const leftX = tipX - ux * size - uy * size * 0.55;
  const leftY = tipY - uy * size + ux * size * 0.55;
  const rightX = tipX - ux * size + uy * size * 0.55;
  const rightY = tipY - uy * size - ux * size * 0.55;
  return (
    <polygon
      points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
      fill="#cab926"
      stroke="#04140a"
      strokeWidth={1}
    />
  );
}

function EventDiamond(props: { cx?: number; cy?: number; active?: boolean }) {
  const { cx = 0, cy = 0, active = false } = props;
  const size = active ? 9 : 7;
  return (
    <g>
      {active ? <circle cx={cx} cy={cy} r={size + 6} fill="#cab926" fillOpacity={0.2} /> : null}
      <polygon
        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
        fill="#cab926"
        stroke="#2a1208"
        strokeWidth={1.5}
      />
    </g>
  );
}

function AnchorDot(props: { cx?: number; cy?: number; fill?: string; r?: number }) {
  const { cx = 0, cy = 0, fill = "#cab926", r = 7 } = props;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill={fill} fillOpacity={0.22} />
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#04140a" strokeWidth={2} />
    </g>
  );
}

function YearTick(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  return <circle cx={cx} cy={cy} r={3.5} fill="#e5e7eb" stroke="#04140a" strokeWidth={1.25} />;
}

function GhostMonth(props: { cx?: number; cy?: number }) {
  const { cx = 0, cy = 0 } = props;
  return <circle cx={cx} cy={cy} r={5} fill="transparent" />;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Weiches Ankommen an Monatspunkten — Linie wandert, statt zu springen. */
function easeInOutCubic(t: number) {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function CityPathScatter({ day, scopeId, scopeLabel, series: sharedSeries }: Props) {
  const [ready, setReady] = useState(Boolean(sharedSeries?.length));
  /** Kontinuierlicher Cursor 0…lastIndex — Nachkommastellen = Interpolation zwischen Monaten. */
  const [playCursor, setPlayCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>("0.5x");
  const playCursorRef = useRef(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );

  useEffect(() => {
    if (sharedSeries && sharedSeries.length > 0) {
      setReady(true);
      return;
    }
    setReady(false);
    const handle = window.setTimeout(() => {
      startTransition(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [day, scopeId, sharedSeries]);

  const series = useMemo(() => {
    if (!ready) return [] as LongTermMonthPoint[];
    if (sharedSeries && sharedSeries.length > 0) return sharedSeries;
    return buildLongTermMonthlySeries(day, scopeId);
  }, [ready, day, scopeId, sharedSeries]);

  const pathPoints = useMemo<PathPoint[]>(
    () =>
      series.map((point, index) => ({
        crime: point.crime,
        economy: point.economy,
        label: point.label,
        day: point.day,
        index,
        kind: "path" as const,
      })),
    [series],
  );

  const lastIndex = Math.max(0, pathPoints.length - 1);
  // Cursor immer in [0, lastIndex] klemmen — verhindert undefined beim Serienwechsel.
  const safeCursor = Number.isFinite(playCursor)
    ? Math.min(lastIndex, Math.max(0, playCursor))
    : lastIndex;
  const playIndex = Math.min(lastIndex, Math.floor(safeCursor + 1e-9));
  const playFrac = Math.min(1, Math.max(0, safeCursor - playIndex));

  // Scope/Serie wechselt → Pause, am Ende starten (Review); Play beginnt dann von 0.
  useEffect(() => {
    setPlaying(false);
    setPlayCursor(lastIndex);
    playCursorRef.current = lastIndex;
  }, [day, scopeId, lastIndex]);

  useEffect(() => {
    playCursorRef.current = playCursor;
  }, [playCursor]);

  // Wenn die Serie kürzer wird, Cursor sofort klemmen (vor dem nächsten Paint mit stale Cursor).
  useEffect(() => {
    if (playCursorRef.current > lastIndex) {
      playCursorRef.current = lastIndex;
      setPlayCursor(lastIndex);
      setPlaying(false);
    }
  }, [lastIndex]);

  const markers = useMemo(() => longTermPathMarkers(series, scopeId), [series, scopeId]);

  const eventIndexes = useMemo(() => {
    const set = new Set<number>();
    for (const marker of markers) {
      const hit =
        pathPoints.find((point) => point.day === marker.day) ??
        pathPoints.find((point) => point.label === marker.label);
      if (hit) set.add(hit.index);
    }
    return set;
  }, [markers, pathPoints]);

  /** Trail inkl. interpoliertem Kopf — die letzte Kante wächst sichtbar. */
  const revealed = useMemo(() => {
    if (pathPoints.length === 0) return [] as PathPoint[];
    const floor = Math.min(lastIndex, Math.max(0, Math.floor(safeCursor + 1e-9)));
    const frac = Math.min(1, Math.max(0, safeCursor - floor));
    const base = pathPoints.slice(0, floor + 1);
    if (frac < 0.001 || floor >= lastIndex) return base;

    const from = pathPoints[floor];
    const to = pathPoints[floor + 1];
    if (!from || !to) return base;

    const eased = easeInOutCubic(frac);
    return [
      ...base,
      {
        crime: lerp(from.crime, to.crime, eased),
        economy: lerp(from.economy, to.economy, eased),
        label: to.label,
        day: to.day,
        index: floor + frac,
        kind: "path" as const,
      },
    ];
  }, [pathPoints, safeCursor, lastIndex]);

  const eventPoints = useMemo(() => {
    const points: PathPoint[] = [];
    markers.forEach((marker, index) => {
      const hit =
        pathPoints.find((point) => point.day === marker.day) ??
        pathPoints.find((point) => point.label === marker.label);
      if (!hit || hit.index > safeCursor + 0.02) return;
      points.push({
        crime: hit.crime,
        economy: hit.economy,
        label: hit.label,
        day: hit.day,
        index,
        kind: "event",
        title: marker.title,
      });
    });
    return points;
  }, [markers, pathPoints, safeCursor]);

  const yearPoints = useMemo(
    () =>
      pathPoints
        .filter(
          (point) =>
            point.index <= playIndex &&
            (point.day.slice(5, 7) === "01" || point.index === 0),
        )
        .map((point) => ({ ...point, kind: "year" as const })),
    [pathPoints, playIndex],
  );

  const startPoint = useMemo<PathPoint | null>(() => {
    const first = pathPoints[0];
    if (!first) return null;
    return { ...first, kind: "start" };
  }, [pathPoints]);

  const headPoint = useMemo<PathPoint | null>(() => {
    const last = revealed[revealed.length - 1];
    if (!last) return null;
    const labelSource =
      playFrac > 0.12 && playIndex < lastIndex
        ? pathPoints[playIndex + 1]
        : pathPoints[playIndex];
    return {
      ...last,
      label: labelSource?.label ?? last.label,
      day: labelSource?.day ?? last.day,
      kind: "head",
    };
  }, [revealed, playFrac, playIndex, lastIndex, pathPoints]);

  const activeEventTitle = useMemo(() => {
    if (playFrac > 0.08) return null;
    const source = pathPoints[playIndex];
    if (!source) return null;
    return eventPoints.find((point) => point.day === source.day)?.title ?? null;
  }, [eventPoints, pathPoints, playIndex, playFrac]);

  // Domain bleibt auf der VOLLEN Serie — sonst springt die Kamera beim Abspielen.
  const xDomain = useMemo(
    () => paddedDomain(pathPoints.map((point) => point.crime)),
    [pathPoints],
  );
  const yDomain = useMemo(
    () => paddedDomain(pathPoints.map((point) => point.economy)),
    [pathPoints],
  );

  const fromLabel = useMemo(() => {
    const [year, month] = HISTORY_START.split("-").map(Number);
    return formatKassadrasMonthYear(year, month - 1);
  }, []);

  const deltaCrime =
    startPoint && headPoint ? Math.round(headPoint.crime - startPoint.crime) : null;
  const deltaEconomy =
    startPoint && headPoint ? Math.round(headPoint.economy - startPoint.economy) : null;

  const atEnd = safeCursor >= lastIndex - 0.001;

  const scrubTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(lastIndex, index));
    setPlaying(false);
    setPlayCursor(next);
    playCursorRef.current = next;
  }, [lastIndex]);

  const togglePlay = useCallback(() => {
    if (reducedMotion) return;
    setPlaying((current) => {
      if (current) return false;
      if (playCursorRef.current >= lastIndex - 0.001) {
        setPlayCursor(0);
        playCursorRef.current = 0;
      }
      return true;
    });
  }, [lastIndex, reducedMotion]);

  const restart = useCallback(() => {
    setPlaying(false);
    setPlayCursor(0);
    playCursorRef.current = 0;
  }, []);

  // Weiches Abspielen: Cursor gleitet zwischen Monaten (rAF), Linie wächst mit.
  useEffect(() => {
    if (!playing || reducedMotion || pathPoints.length < 2) return;

    let raf = 0;
    let lastTs = performance.now();
    let pauseLeft = 0;

    const tick = (now: number) => {
      const dt = Math.min(48, now - lastTs);
      lastTs = now;

      if (pauseLeft > 0) {
        pauseLeft -= dt;
        raf = window.requestAnimationFrame(tick);
        return;
      }

      const prev = playCursorRef.current;
      if (prev >= lastIndex - 0.0001) {
        playCursorRef.current = lastIndex;
        setPlayCursor(lastIndex);
        setPlaying(false);
        return;
      }

      let next = prev + dt / SPEED_MS[speed];
      const prevFloor = Math.floor(prev + 1e-9);
      const nextFloor = Math.floor(next + 1e-9);

      for (let crossed = prevFloor + 1; crossed <= nextFloor; crossed += 1) {
        if (crossed > 0 && eventIndexes.has(crossed)) {
          next = crossed;
          pauseLeft = 750;
          break;
        }
      }

      if (next >= lastIndex) {
        playCursorRef.current = lastIndex;
        setPlayCursor(lastIndex);
        setPlaying(false);
        return;
      }

      playCursorRef.current = next;
      setPlayCursor(next);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing, reducedMotion, pathPoints.length, lastIndex, speed, eventIndexes]);

  const renderPathLine = useCallback(
    (props: { points?: Array<{ x?: number | null; y?: number | null }> }) => (
      <GradientTimePath points={props.points} totalMonths={pathPoints.length} />
    ),
    [pathPoints.length],
  );

  if (!ready) {
    return (
      <div className="mt-4 rounded-md border border-hero-dark/60 bg-background-card/70 p-5">
        <p className="font-cinzel text-lg font-bold text-accent-gold">Zustandsraum</p>
        <p className="mt-2 font-libre text-sm text-gray-300">Pfad wird gerechnet…</p>
      </div>
    );
  }

  if (pathPoints.length < 2) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-hero-border/40 bg-background-card p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-cinzel text-lg font-bold text-accent-gold">
            Zustandsraum · Kriminalität × Wirtschaft
          </h3>
          <p className="mt-1 max-w-2xl font-libre text-sm leading-relaxed text-gray-200">
            Zeitraffer: Der Punkt gleitet sichtbar von Monat zu Monat. Die Zukunft bleibt unsichtbar —
            nur der zurückgelegte Trail bleibt als Spur stehen.
          </p>
          <p className="mt-1 font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {scopeLabel} · {fromLabel} bis Stichtag · {pathPoints.length} Monate
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded border border-sky-400/40 bg-sky-400/10 px-3 py-2">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-sky-300">
              Start
            </p>
            <p className="font-barlow text-sm font-extrabold text-white">{startPoint?.label}</p>
            <p className="font-libre text-xs text-gray-300">
              Kri {Math.round(startPoint?.crime ?? 0)} · Wirt {Math.round(startPoint?.economy ?? 0)}
            </p>
          </div>
          <div className="rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 min-w-[9.5rem]">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
              Abspielstand
            </p>
            <p className="font-barlow text-sm font-extrabold text-white">{headPoint?.label}</p>
            <p className="font-libre text-xs text-gray-300">
              Kri {Math.round(headPoint?.crime ?? 0)} · Wirt {Math.round(headPoint?.economy ?? 0)}
            </p>
            {activeEventTitle ? (
              <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                {activeEventTitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded border border-hero-dark/70 bg-background-dark/50 px-3 py-2">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Achsen
          </p>
          <p className="mt-0.5 font-libre text-xs leading-snug text-gray-200">
            Links = sicherer · Rechts = unsicherer · Oben = wohlhabender · Unten = schwächer
          </p>
        </div>
        <div className="rounded border border-hero-dark/70 bg-background-dark/50 px-3 py-2">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Zielrichtung
          </p>
          <p className="mt-0.5 font-libre text-xs leading-snug text-hero-vibrant">
            Ideal: nach links oben (sicherer und wohlhabender)
          </p>
        </div>
        <div className="rounded border border-hero-dark/70 bg-background-dark/50 px-3 py-2">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Drift seit Start
          </p>
          <p className="mt-0.5 font-barlow text-sm font-extrabold tabular-nums text-white">
            Kri {deltaCrime != null && deltaCrime > 0 ? "+" : ""}
            {deltaCrime ?? "—"}
            <span className="mx-1.5 text-gray-500">·</span>
            Wirt {deltaEconomy != null && deltaEconomy > 0 ? "+" : ""}
            {deltaEconomy ?? "—"}
          </p>
          <p className="mt-0.5 font-libre text-[10px] text-gray-400">
            Live zum Abspielstand · Sehne = Start→Kopf
          </p>
        </div>
      </div>

      {/* Scrubber / Transport */}
      <div className="mt-4 rounded-md border border-hero-dark/70 bg-background-dark/50 px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={reducedMotion}
            title={reducedMotion ? "Reduzierte Bewegung aktiv — bitte Scrubber nutzen" : playing ? "Pause" : "Abspielen"}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-hero-border/60 bg-hero-dark/40 text-accent-gold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={restart}
            title="Zum Start"
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-hero-border/40 bg-transparent text-gray-300 transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="flex rounded border border-hero-border/40 p-0.5">
            {(["0.5x", "1x", "2x"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSpeed(key)}
                className={`rounded px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                  speed === key ? "bg-hero-vibrant text-[#04140a]" : "text-gray-400"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <p className="font-barlow text-xs font-bold uppercase tracking-wide text-gray-300">
            {headPoint?.label ?? "—"}
            <span className="ml-2 text-gray-500">
              {playIndex + 1}/{pathPoints.length}
            </span>
            {atEnd ? <span className="ml-2 text-accent-gold">Ende</span> : null}
          </p>
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Zeitachse</span>
          <input
            type="range"
            min={0}
            max={lastIndex}
            step={1}
            value={playIndex}
            onChange={(event) => scrubTo(Number(event.target.value))}
            className="w-full cursor-pointer accent-[#cab926]"
          />
        </label>

        {eventPoints.length > 0 || markers.length > 0 ? (
          <div className="relative mt-1 h-3">
            {markers.map((marker) => {
              const hit =
                pathPoints.find((point) => point.day === marker.day) ??
                pathPoints.find((point) => point.label === marker.label);
              if (!hit || lastIndex === 0) return null;
              const left = (hit.index / lastIndex) * 100;
              const reached = hit.index <= playIndex;
              return (
                <button
                  key={marker.id}
                  type="button"
                  title={`${marker.title} · ${hit.label}`}
                  onClick={() => scrubTo(hit.index)}
                  className={`absolute top-0 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border border-[#2a1208] ${
                    reached ? "bg-accent-gold" : "bg-gray-600"
                  }`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>
        ) : null}

        {reducedMotion ? (
          <p className="mt-2 font-libre text-xs text-gray-400">
            Reduzierte Bewegung: bitte den Regler nutzen — Autoplay ist aus.
          </p>
        ) : (
          <p className="mt-2 font-libre text-xs text-gray-400">
            Play lässt die Linie zwischen den Monaten gleiten. Zukunft bleibt leer. Rauten = Ereignisse.
          </p>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-center font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
          ↑ Wirtschaft stärker
        </div>
        <div className="flex items-stretch gap-1">
          {/* Links = niedrigere Kriminalität; Pfeil bleibt horizontal (nicht mit writing-mode drehen). */}
          <div className="flex w-12 shrink-0 items-center justify-center gap-0.5">
            <span
              className="shrink-0 font-barlow text-sm font-extrabold leading-none text-sky-300"
              aria-hidden
            >
              ←
            </span>
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-sky-300 [writing-mode:vertical-rl]">
              Sicherer
            </p>
          </div>

          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-hero-vibrant/40 bg-background-dark/80 px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
              Ideal
            </div>
            <div className="pointer-events-none absolute bottom-8 right-3 z-10 rounded border border-red-400/40 bg-background-dark/80 px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-red-300">
              Risiko
            </div>

            <div className="h-[22rem] rounded-md border border-hero-dark/60 bg-background-dark/60 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 14, right: 14, bottom: 22, left: 4 }}>
                  <ReferenceArea
                    x1={xDomain[0]}
                    x2={(xDomain[0] + xDomain[1]) / 2}
                    y1={(yDomain[0] + yDomain[1]) / 2}
                    y2={yDomain[1]}
                    fill="#379806"
                    fillOpacity={0.07}
                    ifOverflow="hidden"
                  />
                  <ReferenceArea
                    x1={(xDomain[0] + xDomain[1]) / 2}
                    x2={xDomain[1]}
                    y1={yDomain[0]}
                    y2={(yDomain[0] + yDomain[1]) / 2}
                    fill="#58180D"
                    fillOpacity={0.09}
                    ifOverflow="hidden"
                  />
                  <CartesianGrid stroke="#23c76328" strokeDasharray="4 6" />
                  <XAxis
                    type="number"
                    dataKey="crime"
                    name="Kriminalität"
                    domain={xDomain}
                    tick={{ fill: "#e5e7eb", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#23c76366" }}
                    tickLine={{ stroke: "#23c76344" }}
                    label={{
                      value: "Kriminalität →",
                      position: "insideBottom",
                      offset: -10,
                      fill: "#d1d5db",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="economy"
                    name="Wirtschaft"
                    domain={yDomain}
                    tick={{ fill: "#e5e7eb", fontSize: 12, fontWeight: 600 }}
                    axisLine={{ stroke: "#23c76366" }}
                    tickLine={{ stroke: "#23c76344" }}
                    width={36}
                  />
                  <ZAxis range={[40, 40]} />
                  <Tooltip
                    content={<PathTooltip />}
                    isAnimationActive={false}
                    cursor={{ stroke: "#cab92655", strokeDasharray: "4 4" }}
                  />

                  <Scatter
                    name="Pfad"
                    data={revealed}
                    line={renderPathLine}
                    lineType="joint"
                    lineJointType="linear"
                    shape={(props) => <GhostMonth {...props} />}
                    isAnimationActive={false}
                  />

                  {yearPoints.length > 0 ? (
                    <Scatter
                      name="Jahre"
                      data={yearPoints}
                      shape={(props) => <YearTick {...props} />}
                      isAnimationActive={false}
                    />
                  ) : null}

                  {eventPoints.length > 0 ? (
                    <Scatter
                      name="Ereignisse"
                      data={eventPoints}
                      shape={(props) => {
                        const payload = (props as { payload?: PathPoint }).payload;
                        const active = Boolean(
                          payload && pathPoints[playIndex]?.day === payload.day,
                        );
                        return <EventDiamond {...props} active={active} />;
                      }}
                      isAnimationActive={false}
                    />
                  ) : null}

                  {startPoint && playIndex >= 0 ? (
                    <Scatter
                      name="Start"
                      data={[startPoint]}
                      shape={(props) => <AnchorDot {...props} fill="#7dd3fc" r={7} />}
                      isAnimationActive={false}
                    />
                  ) : null}

                  {headPoint ? (
                    <Scatter
                      name="Kopf"
                      data={[headPoint]}
                      shape={(props) => <AnchorDot {...props} fill="#cab926" r={8} />}
                      isAnimationActive={false}
                    />
                  ) : null}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rechts = höhere Kriminalität; Pfeil bleibt horizontal. */}
          <div className="flex w-12 shrink-0 items-center justify-center gap-0.5">
            <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-red-300 [writing-mode:vertical-rl]">
              Unsicherer
            </p>
            <span
              className="shrink-0 font-barlow text-sm font-extrabold leading-none text-red-300"
              aria-hidden
            >
              →
            </span>
          </div>
        </div>
        <div className="mt-1 text-center font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-400">
          ↓ Wirtschaft schwächer
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-300" aria-hidden />
          Start
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-gold" aria-hidden />
          Abspielstand
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rotate-45 bg-accent-gold" aria-hidden />
          Ereignis
        </span>
        <span className="inline-flex items-center gap-1.5 text-gray-400">
          <span
            className="inline-block h-0.5 w-8"
            style={{
              background: "linear-gradient(90deg, #7dd3fc, #379806, #cab926)",
            }}
            aria-hidden
          />
          Trail (Zukunft ausgeblendet)
        </span>
      </div>

      {eventPoints.length > 0 ? (
        <div className="mt-4">
          <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-300">
            Bisher sichtbare Ereignisse
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {eventPoints.map((point) => {
              const active = pathPoints[playIndex]?.day === point.day;
              return (
                <li
                  key={`${point.title}-${point.day}`}
                  className={`rounded border px-3 py-2 ${
                    active
                      ? "border-accent-gold/70 bg-accent-gold/10"
                      : "border-hero-dark/70 bg-background-dark/55"
                  }`}
                >
                  <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                    {point.title}
                  </p>
                  <p className="mt-0.5 font-libre text-xs text-gray-300">{point.label}</p>
                  <p className="mt-1 font-barlow text-[11px] font-bold tabular-nums text-gray-200">
                    Kri {Math.round(point.crime)} · Wirt {Math.round(point.economy)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 font-libre text-xs text-gray-500">
          Noch keine Ereignisse auf dem Trail — weiter abspielen oder vorwärts scrubben.
        </p>
      )}
    </div>
  );
}
