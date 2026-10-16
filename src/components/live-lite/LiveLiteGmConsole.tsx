"use client";

/**
 * Spielleiterfläche der Lite-Bühne: Palette, Hintergrund, Würfel.
 * Der Wurf startet nur hier. Die Spielerroute rendert diese Steuerung nicht.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, Monitor, X } from "lucide-react";
import { LiveLiteStage } from "@/src/components/live-lite/LiveLiteStage";
import { useDiceSkin } from "@/src/hooks/useDiceSkin";
import { rollLiteDice } from "@/src/lib/live-lite/roll";
import {
  parseLiteChannelMessage,
} from "@/src/lib/live-lite/channel";
import {
  EMPTY_LITE_BOARD,
  liveLiteChannelName,
  liveLitePlayerPath,
  type LiteBoardState,
  type LiteCatalog,
  type LiteStageItem,
} from "@/src/lib/live-lite/types";
import {
  dicePoolSize,
  formatDicePoolFormula,
  type DicePoolGroup,
} from "@/src/lib/session/dice-roll";

const DICE_SIDES = [4, 6, 8, 10, 12, 20] as const;
const MAX_POOL = 12;

const KINDS = [
  { id: "npc", label: "NPCs" },
  { id: "beast", label: "Bestiarium" },
  { id: "scene", label: "Szenen" },
  { id: "faction", label: "Fraktionen" },
  { id: "location", label: "Orte" },
] as const;

type KindId = (typeof KINDS)[number]["id"];

type Props = {
  campaignId: string;
  campaignName: string;
  userId: string;
  catalog: LiteCatalog;
};

function toStageItem(kind: KindId, catalog: LiteCatalog, id: string): LiteStageItem | null {
  if (kind === "npc") {
    const npc = catalog.npcs.find((row) => row.id === id);
    if (!npc) return null;
    return {
      kind: "npc",
      id,
      npc: { ...npc, description: null },
    };
  }
  if (kind === "beast") {
    const beast = catalog.beasts.find((row) => row.id === id);
    if (!beast) return null;
    return {
      kind: "beast",
      id,
      creature: { ...beast, physical_description: null },
    };
  }
  if (kind === "scene") {
    const scene = catalog.scenes.find((row) => row.id === id);
    if (!scene) return null;
    return { kind: "scene", id, scene };
  }
  if (kind === "faction") {
    const faction = catalog.factions.find((row) => row.id === id);
    if (!faction) return null;
    return {
      kind: "faction",
      id,
      faction: { ...faction, description: null },
    };
  }
  const location = catalog.locations.find((row) => row.id === id);
  if (!location) return null;
  return {
    kind: "location",
    id,
    location: {
      id: location.id,
      name: location.name,
      type: location.type,
      imageUrl: location.image_url,
    },
  };
}

export function LiveLiteGmConsole({ campaignId, campaignName, userId, catalog }: Props) {
  const [state, setState] = useState<LiteBoardState>(EMPTY_LITE_BOARD);
  const [kind, setKind] = useState<KindId>("npc");
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState<Partial<Record<number, number>>>({});
  const [rolling, setRolling] = useState(false);
  const stateRef = useRef(state);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const { skinId } = useDiceSkin(userId, true);
  stateRef.current = state;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(liveLiteChannelName(campaignId));
    channelRef.current = channel;
    const onMessage = (event: MessageEvent) => {
      const message = parseLiteChannelMessage(event.data);
      if (message?.type === "hello") {
        channel.postMessage({ type: "state", state: stateRef.current });
      }
    };
    channel.addEventListener("message", onMessage);
    channel.postMessage({ type: "state", state: stateRef.current });
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [campaignId]);

  useEffect(() => {
    channelRef.current?.postMessage({ type: "state", state });
  }, [state]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list =
      kind === "npc"
        ? catalog.npcs.map((row) => ({
            id: row.id,
            title: row.name,
            subtitle: row.title,
            imageUrl: row.image_url,
          }))
        : kind === "beast"
          ? catalog.beasts.map((row) => ({
              id: row.id,
              title: row.name,
              subtitle: row.creature_type,
              imageUrl: row.image_url,
            }))
          : kind === "scene"
            ? catalog.scenes.map((row) => ({
                id: row.id,
                title: row.title,
                subtitle: row.category,
                imageUrl: row.image_url,
              }))
            : kind === "faction"
              ? catalog.factions.map((row) => ({
                  id: row.id,
                  title: row.name,
                  subtitle: row.type,
                  imageUrl: row.banner_url || row.image_url,
                }))
              : catalog.locations.map((row) => ({
                  id: row.id,
                  title: row.name,
                  subtitle: row.type,
                  imageUrl: row.image_url,
                }));
    if (!q) return list;
    return list.filter((row) =>
      `${row.title} ${row.subtitle ?? ""}`.toLowerCase().includes(q),
    );
  }, [catalog, kind, query]);

  function isPlaced(id: string) {
    return state.items.some((item) => item.kind === kind && item.id === id);
  }

  function toggleItem(id: string) {
    setState((current) => {
      const exists = current.items.some((item) => item.kind === kind && item.id === id);
      if (exists) {
        return {
          ...current,
          items: current.items.filter((item) => !(item.kind === kind && item.id === id)),
        };
      }
      const next = toStageItem(kind, catalog, id);
      if (!next) return current;
      return { ...current, items: [...current.items, next] };
    });
  }

  function setBackground(locationId: string) {
    if (!locationId) {
      setState((current) => ({ ...current, background: null }));
      return;
    }
    const location = catalog.locations.find((row) => row.id === locationId);
    if (!location) return;
    setState((current) => ({
      ...current,
      background: {
        locationId: location.id,
        name: location.name,
        imageUrl: location.image_url,
      },
    }));
  }

  const groups: DicePoolGroup[] = DICE_SIDES.map((sides) => ({
    sides,
    count: pool[sides] ?? 0,
  })).filter((group) => group.count > 0);
  const poolCount = dicePoolSize(groups);

  function addDie(sides: number) {
    setPool((current) => {
      const total = Object.values(current).reduce<number>((sum, count) => sum + (count ?? 0), 0);
      if (total >= MAX_POOL) return current;
      return { ...current, [sides]: (current[sides] ?? 0) + 1 };
    });
  }

  async function roll() {
    if (rolling || groups.length === 0) return;
    setRolling(true);
    try {
      const entry = await rollLiteDice({ groups, skinId });
      if (!entry) return;
      const label = typeof entry.meta?.display === "string" ? entry.meta.display : entry.text;
      setState((current) => ({
        ...current,
        diceLogs: [entry],
        resultLabel: label,
      }));
      setPool({});
    } finally {
      setRolling(false);
    }
  }

  function openPlayerBoard() {
    window.open(liveLitePlayerPath(campaignId), "th-live-lite-board");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Live-Session Lite
          </h1>
          <p className="mt-1 font-libre text-gray-200">
            {campaignName} — ohne Termin, ohne Spielerzwang. Die Steuerung bleibt auf diesem
            Bildschirm.
          </p>
        </div>
        <button
          type="button"
          onClick={openPlayerBoard}
          className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white hover:bg-hero-vibrant"
        >
          <Monitor className="h-4 w-4" />
          Spieler-Board öffnen
        </button>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="overflow-hidden rounded-md border border-hero-dark shadow-lg">
          <LiveLiteStage campaignId={campaignId} state={state} />
        </div>

        <aside className="space-y-4 rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
          <div>
            <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-gray-200">
              Bühnenhintergrund
            </h2>
            <label className="mt-2 block font-barlow text-xs uppercase text-gray-400" htmlFor="lite-bg">
              Lore-Ort
            </label>
            <select
              id="lite-bg"
              value={state.background?.locationId ?? ""}
              onChange={(event) => setBackground(event.target.value)}
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            >
              <option value="">Kein Bild — dunkler Grund</option>
              {catalog.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.image_url ? "" : " (ohne Bild)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-gray-200">
              Auf die Bühne legen
            </h2>
            <div className="mt-2 flex flex-wrap gap-1">
              {KINDS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setKind(entry.id)}
                  className={`rounded px-2 py-1 font-barlow text-xs font-bold uppercase ${
                    kind === entry.id
                      ? "bg-hero-vibrant text-white"
                      : "border border-hero-dark text-gray-200"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Suchen"
              className="mt-2 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
            />
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
              {rows.length === 0 ? (
                <li className="font-libre text-sm text-gray-400">Nichts in dieser Liste.</li>
              ) : (
                rows.map((row) => {
                  const placed = isPlaced(row.id);
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        aria-pressed={placed}
                        onClick={() => toggleItem(row.id)}
                        className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left ${
                          placed
                            ? "border-hero-vibrant bg-hero-dark/40"
                            : "border-hero-dark bg-background-dark"
                        }`}
                      >
                        <Thumb url={row.imageUrl} label={row.title} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-cinzel text-sm text-accent-gold">
                            {row.title}
                          </span>
                          {row.subtitle ? (
                            <span className="block truncate font-barlow text-[10px] uppercase text-gray-300">
                              {row.subtitle}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-barlow text-[10px] uppercase text-hero-vibrant">
                          {placed ? "Weg" : "Legen"}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {state.items.length > 0 ? (
              <button
                type="button"
                onClick={() => setState((current) => ({ ...current, items: [] }))}
                className="mt-2 inline-flex items-center gap-1 font-barlow text-xs font-bold uppercase text-gray-300"
              >
                <X className="h-3 w-3" />
                Bühne leeren
              </button>
            ) : null}
          </div>

          <div>
            <h2 className="font-barlow text-sm font-bold uppercase tracking-wide text-gray-200">
              Würfel
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DICE_SIDES.map((sides) => (
                <button
                  key={sides}
                  type="button"
                  onClick={() => addDie(sides)}
                  className="rounded border border-hero-dark bg-background-dark px-2 py-2 font-barlow text-sm font-bold uppercase text-white"
                >
                  W{sides}
                  {(pool[sides] ?? 0) > 0 ? ` ×${pool[sides]}` : ""}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={rolling || poolCount === 0}
                onClick={() => void roll()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-hero-vibrant bg-hero-vibrant px-3 py-2 font-barlow text-sm font-extrabold uppercase text-white enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Dices className="h-4 w-4" />
                {poolCount > 0 ? formatDicePoolFormula(groups) : "Würfeln"}
              </button>
              <button
                type="button"
                onClick={() => setPool({})}
                className="rounded border border-hero-dark px-3 font-barlow text-xs font-bold uppercase text-gray-300"
              >
                Leer
              </button>
            </div>
            <p className="mt-2 font-libre text-xs text-gray-400">
              Klick setzt den Wurf, dann ziehst du wie am großen Tisch. Nur dieser Bildschirm
              würfelt.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Thumb({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-background-dark font-cinzel text-sm text-accent-gold">
        {label.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Kleine vorhandene Kartenbilder
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
  );
}
