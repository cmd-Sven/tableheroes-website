"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Crown,
  Info,
  Layers,
  Play,
  ScrollText,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  dismissAurenfurtPresentedCard,
  listAurenfurtSessionHand,
  playAurenfurtCityEventFromHand,
  playAurenfurtKaiserCardFromHand,
  playAurenfurtNpcCardFromHand,
  type AurenfurtHandCityEvent,
  type AurenfurtHandEntry,
  type AurenfurtHandKaiserCard,
  type AurenfurtPresentedCard,
} from "@/src/lib/actions/aurenfurt-session-actions";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "@/src/components/city/aurenfurt/aurenfurt-districts";
import { activateKaiserCard } from "@/src/components/city/aurenfurt/aurenfurt-verwaltung-store";
import { AurenfurtPlayedCardModal } from "@/src/components/session/AurenfurtPlayedCardModal";

export const AURENFURT_PRESSURE_RELOAD_EVENT = "th:aurenfurt-pressure-reload";

type Props = {
  sessionId: string;
  open: boolean;
  onToggle: () => void;
  /** Session noch „Scheduled“ → NPC-Karten gesperrt; Stadtereignisse/Kaiser dürfen schon. */
  isPrepMode?: boolean;
  /** Kalendertag der Stadtkarte — für Ablauf abgelaufener Ereignisse. */
  dayIso?: string | null;
};

type CardMenuState = {
  entry: AurenfurtHandEntry;
  x: number;
  y: number;
  playDisabled: boolean;
};

function needsDistrictPick(entry: AurenfurtHandEntry): entry is AurenfurtHandKaiserCard {
  return entry.kind === "kaiser-card" && entry.scope === "district";
}

function cardBody(entry: AurenfurtHandEntry): string {
  if (entry.kind === "city-event") return entry.body;
  return entry.text;
}

function cardMetaLine(entry: AurenfurtHandEntry): string {
  if (entry.kind === "kaiser-card") {
    const scope =
      entry.scope === "district"
        ? "Zielviertel wählen"
        : entry.scope === "palace"
          ? "Palast"
          : "Ganz Aurenfurt";
    return `Kaiser · ${entry.durationDays} Tage · ${scope}`;
  }
  if (entry.kind === "city-event") {
    return `Stadtereignis · ${entry.scope === "city" ? "Stadtweit" : entry.scope}`;
  }
  return `NPC · ${entry.npcName}`;
}

export function CitySimDeckHand({
  sessionId,
  open,
  onToggle,
  isPrepMode = false,
  dayIso = null,
}: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [entries, setEntries] = useState<AurenfurtHandEntry[]>([]);
  const [pending, startTransition] = useTransition();
  const [presented, setPresented] = useState<AurenfurtPresentedCard | null>(null);
  const [menu, setMenu] = useState<CardMenuState | null>(null);
  const [infoEntry, setInfoEntry] = useState<AurenfurtHandEntry | null>(null);
  const [districtPick, setDistrictPick] = useState<AurenfurtHandKaiserCard | null>(null);
  const [pickDistrict, setPickDistrict] = useState<CityDistrictId>("unterstadt");
  const menuRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => {
    startTransition(async () => {
      try {
        const next = await listAurenfurtSessionHand(sessionId, { dayIso });
        setEntries(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Stadt-Hand konnte nicht geladen werden.");
        setEntries([]);
      }
    });
  }, [dayIso, sessionId]);

  const kaiserCards = useMemo(
    () => entries.filter((entry): entry is AurenfurtHandKaiserCard => entry.kind === "kaiser-card"),
    [entries],
  );
  const cityEvents = useMemo(
    () => entries.filter((entry): entry is AurenfurtHandCityEvent => entry.kind === "city-event"),
    [entries],
  );
  const npcCards = useMemo(
    () => entries.filter((entry) => entry.kind === "npc-card"),
    [entries],
  );

  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-th-city-sim-deck-hand", "true");
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--th-hand-dock-h", open ? "13.5rem" : "4.75rem");
    root.style.setProperty("--th-hand-dock-layers-h", open ? "5.5rem" : "4.75rem");
    root.dataset.thCityHandOpen = open ? "1" : "0";
    window.dispatchEvent(new Event("th:city-hand-open-change"));
    return () => {
      root.style.removeProperty("--th-hand-dock-h");
      root.style.removeProperty("--th-hand-dock-layers-h");
      delete root.dataset.thCityHandOpen;
      window.dispatchEvent(new Event("th:city-hand-open-change"));
    };
  }, [open]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onReload = () => reload();
    window.addEventListener(AURENFURT_PRESSURE_RELOAD_EVENT, onReload);
    return () => window.removeEventListener(AURENFURT_PRESSURE_RELOAD_EVENT, onReload);
  }, [reload]);

  useEffect(() => {
    if (open) reload();
    else {
      setMenu(null);
      setInfoEntry(null);
      setDistrictPick(null);
    }
  }, [open, reload]);

  useEffect(() => {
    if (!menu) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function playDisabledReason(entry: AurenfurtHandEntry): string | null {
    if (entry.kind === "city-event" && entry.active) {
      return "Dieses Stadtereignis ist bereits aktiv.";
    }
    if (entry.kind === "kaiser-card" && entry.active) {
      return `Diese Kaiser-Karte wirkt noch ${entry.remainingDays ?? "?"} Tag(e).`;
    }
    if (entry.kind === "npc-card" && entry.active) {
      return `Diese NPC-Karte wirkt noch ${entry.remainingDays ?? "?"} Tag(e).`;
    }
    if (isPrepMode && entry.kind === "npc-card") {
      return "Vorbereitung: NPC-Ereigniskarten können erst Live ausgespielt werden.";
    }
    return null;
  }

  function requestPlay(entry: AurenfurtHandEntry) {
    const blocked = playDisabledReason(entry);
    if (blocked) {
      toast.message(blocked);
      return;
    }
    setMenu(null);
    if (needsDistrictPick(entry)) {
      setPickDistrict(entry.districtId && isDistrictId(entry.districtId) ? entry.districtId : "unterstadt");
      setDistrictPick(entry);
      return;
    }
    void commitPlay(entry, null);
  }

  function commitPlay(entry: AurenfurtHandEntry, districtId: CityDistrictId | null) {
    startTransition(async () => {
      try {
        let shown: AurenfurtPresentedCard;
        if (entry.kind === "city-event") {
          shown = await playAurenfurtCityEventFromHand(sessionId, entry.id, dayIso ?? undefined);
          toast.success(`Stadtereignis „${entry.title}“ aktiv.`);
        } else if (entry.kind === "kaiser-card") {
          shown = await playAurenfurtKaiserCardFromHand(sessionId, entry.cardId, districtId);
          try {
            activateKaiserCard(entry.cardId, districtId);
          } catch {
            /* Druck lokal optional */
          }
          toast.success(`Kaiser-Karte „${entry.title}“ ausgelegt.`);
        } else {
          shown = await playAurenfurtNpcCardFromHand(sessionId, entry.npcId, entry.cardId);
          toast.success(`NPC-Karte „${entry.title}“ (${entry.npcName}) ausgespielt.`);
        }
        setDistrictPick(null);
        setPresented(shown);
        window.dispatchEvent(new CustomEvent(AURENFURT_PRESSURE_RELOAD_EVENT));
        const next = await listAurenfurtSessionHand(sessionId, { dayIso });
        setEntries(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Karte konnte nicht ausgespielt werden.");
      }
    });
  }

  async function dismissPresented() {
    if (!presented) return;
    const revealId = presented.revealId;
    setPresented(null);
    try {
      await dismissAurenfurtPresentedCard(sessionId, revealId);
    } catch {
      /* lokal bereits geschlossen */
    }
  }

  if (!host) return null;

  const readyKaiser = kaiserCards.filter((entry) => !entry.active).length;
  const activeKaiser = kaiserCards.filter((entry) => entry.active).length;
  const readyCity = cityEvents.filter((entry) => !entry.active).length;
  const activeCity = cityEvents.filter((entry) => entry.active).length;

  const tray = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col-reverse pl-11 pr-11">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="pointer-events-auto flex w-full items-center gap-3 border-t-2 border-accent-gold bg-[#132e1b] px-4 py-2.5 text-left shadow-[0_-12px_28px_rgba(0,0,0,0.55)]"
      >
        <Building2 className="h-5 w-5 shrink-0 text-accent-gold" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
            {open ? "Stadt-Hand ausblenden" : "Stadt-Hand einblenden"}
            {isPrepMode ? (
              <span className="ml-2 rounded border border-accent-gold/50 bg-accent-gold/15 px-1.5 py-0.5 text-[10px] text-accent-gold">
                Vorbereitung
              </span>
            ) : null}
          </span>
          <span className="block font-libre text-[11px] text-gray-400">
            {pending && entries.length === 0
              ? "Lade Ereigniskarten…"
              : `Kaiser ${readyKaiser}/${activeKaiser} · Stadt ${readyCity}/${activeCity} · NPC ${npcCards.length}`}
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-accent-gold" />
        ) : (
          <ChevronUp className="h-5 w-5 shrink-0 text-accent-gold" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="city-sim-deck-hand"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto border-t border-accent-gold/40 bg-[#132e1b] px-3 pb-3 pt-10"
          >
            {entries.length === 0 ? (
              <p className="px-2 py-4 text-center font-libre text-xs text-gray-400">
                Keine Stadt- oder NPC-Ereigniskarten. Lege Stadtereignisse an oder wähle Stadt-NPCs in
                der Bühnenvorbereitung.
              </p>
            ) : (
              <div className="flex max-h-[9.5rem] min-h-[7.5rem] gap-5 overflow-x-auto overflow-y-visible pb-1 pt-1">
                <HandStack
                  title="Kaiser"
                  emptyHint="Keine Kaiser-Karten."
                  entries={kaiserCards}
                  pending={pending}
                  isPrepMode={isPrepMode}
                  onOpenMenu={(entry, rect, playDisabled) => {
                    setMenu({
                      entry,
                      x: Math.min(window.innerWidth - 220, Math.max(8, rect.left)),
                      y: Math.max(8, rect.top - 8),
                      playDisabled,
                    });
                  }}
                />
                <div className="w-px shrink-0 self-stretch bg-accent-gold/25" aria-hidden />
                <HandStack
                  title="Stadtereignisse"
                  emptyHint="Keine Stadtereignisse."
                  entries={cityEvents}
                  pending={pending}
                  isPrepMode={isPrepMode}
                  onOpenMenu={(entry, rect, playDisabled) => {
                    setMenu({
                      entry,
                      x: Math.min(window.innerWidth - 220, Math.max(8, rect.left)),
                      y: Math.max(8, rect.top - 8),
                      playDisabled,
                    });
                  }}
                />
                <div className="w-px shrink-0 self-stretch bg-accent-gold/25" aria-hidden />
                <HandStack
                  title="NPC-Ereignisse"
                  emptyHint={
                    isPrepMode
                      ? "NPC-Karten erst Live ausspielbar."
                      : "Keine NPC-Ereigniskarten in der Hand."
                  }
                  entries={npcCards}
                  pending={pending}
                  isPrepMode={isPrepMode}
                  onOpenMenu={(entry, rect, playDisabled) => {
                    setMenu({
                      entry,
                      x: Math.min(window.innerWidth - 220, Math.max(8, rect.left)),
                      y: Math.max(8, rect.top - 8),
                      playDisabled,
                    });
                  }}
                />
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {menu ? (
        <div
          ref={menuRef}
          className="pointer-events-auto fixed z-[120] w-52 -translate-y-full overflow-hidden rounded-md border border-hero-border bg-background-dark shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
          aria-label={menu.entry.title}
        >
          <p className="border-b border-hero-dark/70 px-3 py-2 font-cinzel text-sm font-bold text-accent-gold">
            {menu.entry.title}
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={menu.playDisabled || pending}
            onClick={() => requestPlay(menu.entry)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/10 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Ausspielen
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setInfoEntry(menu.entry);
              setMenu(null);
            }}
            className="flex w-full items-center gap-2 border-t border-hero-dark/50 px-3 py-2.5 text-left font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold hover:bg-accent-gold/10"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            Mehr Infos
          </button>
        </div>
      ) : null}

      {infoEntry ? (
        <GmCardInfoModal entry={infoEntry} onClose={() => setInfoEntry(null)} />
      ) : null}

      {districtPick ? (
        <DistrictPickModal
          title={districtPick.title}
          districtId={pickDistrict}
          pending={pending}
          onDistrict={setPickDistrict}
          onCancel={() => setDistrictPick(null)}
          onConfirm={() => commitPlay(districtPick, pickDistrict)}
        />
      ) : null}

      <AurenfurtPlayedCardModal
        card={presented}
        canDismiss
        onDismiss={() => {
          void dismissPresented();
        }}
      />
    </div>
  );

  return createPortal(tray, host);
}

function isDistrictId(value: string): value is CityDistrictId {
  return AURENFURT_DISTRICTS.some((district) => district.id === value);
}

function HandStack({
  title,
  emptyHint,
  entries,
  pending,
  isPrepMode,
  onOpenMenu,
}: {
  title: string;
  emptyHint: string;
  entries: AurenfurtHandEntry[];
  pending: boolean;
  isPrepMode: boolean;
  onOpenMenu: (entry: AurenfurtHandEntry, rect: DOMRect, playDisabled: boolean) => void;
}) {
  return (
    <div className="min-w-0 shrink-0">
      <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
        {title}
        <span className="ml-1.5 text-gray-500">{entries.length}</span>
      </p>
      {entries.length === 0 ? (
        <p className="py-8 pr-6 font-libre text-[11px] text-gray-500">{emptyHint}</p>
      ) : (
        <div className="flex items-end overflow-visible pl-1 pr-4 pt-4">
          {entries.map((entry, stackIndex) => {
            const active = Boolean(
              (entry.kind === "city-event" && entry.active) ||
                (entry.kind === "kaiser-card" && entry.active) ||
                (entry.kind === "npc-card" && entry.active),
            );
            const playDisabled =
              pending ||
              active ||
              (isPrepMode && entry.kind === "npc-card");
            return (
              <CityHandMiniCard
                key={entry.id}
                entry={entry}
                stackIndex={stackIndex}
                active={active}
                onOpen={(rect) => onOpenMenu(entry, rect, playDisabled)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CityHandMiniCard({
  entry,
  stackIndex,
  active,
  onOpen,
}: {
  entry: AurenfurtHandEntry;
  stackIndex: number;
  active: boolean;
  onOpen: (rect: DOMRect) => void;
}) {
  const remaining =
    entry.kind === "kaiser-card" || entry.kind === "city-event" || entry.kind === "npc-card"
      ? entry.remainingDays
      : null;
  const kindLabel =
    entry.kind === "kaiser-card" ? "Kaiser" : entry.kind === "city-event" ? "Stadt" : "NPC";
  const tooltip = active
    ? `${entry.title} — aktiv${remaining != null ? ` · noch ${remaining} Tag${remaining === 1 ? "" : "e"}` : ""}`
    : `${entry.title} — Klick für Menü`;

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      aria-label={tooltip}
      onClick={(event) => {
        onOpen(event.currentTarget.getBoundingClientRect());
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(e.currentTarget.getBoundingClientRect());
        }
      }}
      className={[
        "relative h-[104px] w-[76px] shrink-0 select-none overflow-hidden rounded-md border-2 bg-[#0a1f10] shadow-[2px_4px_10px_rgba(0,0,0,0.65)] transition-transform duration-200",
        "isolate cursor-pointer hover:z-[80] hover:-translate-y-3 hover:scale-105",
        active
          ? "border-hero-vibrant/70 ring-1 ring-hero-vibrant/40"
          : entry.kind === "kaiser-card"
            ? "border-accent-gold hover:border-accent-gold"
            : entry.kind === "city-event"
              ? "border-accent-gold/80 hover:border-accent-gold"
              : "border-hero-border hover:border-hero-vibrant",
      ].join(" ")}
      style={{
        marginLeft: stackIndex === 0 ? 0 : -34,
        zIndex: stackIndex + 1,
      }}
    >
      {entry.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.imageUrl}
          alt=""
          className={`pointer-events-none h-full w-full bg-[#0a1f10] object-cover ${active ? "opacity-80" : ""}`}
          draggable={false}
        />
      ) : (
        <div
          className={`flex h-full w-full flex-col items-center justify-center gap-1 px-1 ${
            entry.kind === "kaiser-card"
              ? "bg-[#2a2410]"
              : entry.kind === "city-event"
                ? "bg-[#1a2e14]"
                : "bg-[#132e1b]"
          }`}
        >
          {entry.kind === "kaiser-card" ? (
            <Crown className="h-6 w-6 text-accent-gold" />
          ) : entry.kind === "city-event" ? (
            <ScrollText className="h-6 w-6 text-accent-gold" />
          ) : (
            <User className="h-6 w-6 text-hero-vibrant" />
          )}
          <span className="line-clamp-3 text-center font-barlow text-[9px] font-bold uppercase leading-tight text-gray-200">
            {entry.title}
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute left-1 top-1 rounded bg-[#0a1f10] px-1 py-0.5 font-barlow text-[8px] font-bold uppercase tracking-wide text-accent-gold">
        {kindLabel}
      </span>
      {active ? (
        <span className="pointer-events-none absolute right-1 top-1 rounded border border-hero-vibrant bg-hero-vibrant/90 px-1 py-0.5 font-barlow text-[8px] font-bold uppercase tracking-wide text-white">
          {remaining != null ? `${remaining}T` : "Aktiv"}
        </span>
      ) : entry.kind === "npc-card" ? (
        <span className="pointer-events-none absolute right-1 top-1 rounded bg-[#0a1f10] p-0.5">
          <Layers className="h-3 w-3 text-hero-vibrant" aria-hidden />
        </span>
      ) : null}
      {entry.imageUrl ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black from-40% to-transparent px-1 pb-1 pt-5">
          <span className="line-clamp-2 font-barlow text-[9px] font-bold uppercase leading-tight text-white">
            {entry.title}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function GmCardInfoModal({
  entry,
  onClose,
}: {
  entry: AurenfurtHandEntry;
  onClose: () => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-hand-card-info-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-md border border-hero-border bg-background-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded border border-hero-dark p-1.5 text-gray-400 hover:text-white"
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3 p-4 pr-12">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded border border-hero-dark bg-background-dark">
            {entry.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-accent-gold">
                {entry.kind === "kaiser-card" ? (
                  <Crown className="h-8 w-8" />
                ) : entry.kind === "city-event" ? (
                  <ScrollText className="h-8 w-8" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {cardMetaLine(entry)}
            </p>
            <h3
              id="city-hand-card-info-title"
              className="mt-1 font-cinzel text-lg font-bold text-accent-gold"
            >
              {entry.title}
            </h3>
            {entry.kind === "kaiser-card" && entry.active && entry.remainingDays != null ? (
              <p className="mt-1 font-libre text-xs text-hero-vibrant">
                Aktiv · noch {entry.remainingDays} Tag{entry.remainingDays === 1 ? "" : "e"}
              </p>
            ) : null}
          </div>
        </div>
        <p className="border-t border-hero-dark/60 px-4 py-3 font-libre text-sm leading-relaxed text-gray-200">
          {cardBody(entry) || "Keine Beschreibung hinterlegt."}
        </p>
        <p className="border-t border-hero-dark/50 px-4 py-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
          Nur für den Spielleiter sichtbar
        </p>
      </div>
    </div>
  );
}

function DistrictPickModal({
  title,
  districtId,
  pending,
  onDistrict,
  onCancel,
  onConfirm,
}: {
  title: string;
  districtId: CityDistrictId;
  pending: boolean;
  onDistrict: (id: CityDistrictId) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-hand-district-pick-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-md border border-hero-border bg-background-card p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="city-hand-district-pick-title"
          className="font-cinzel text-lg font-bold text-accent-gold"
        >
          {title}
        </h3>
        <p className="mt-1 font-libre text-sm text-gray-300">
          In welchem Viertel soll die Karte wirken?
        </p>
        <label className="mt-4 block font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
          Viertel
          <select
            value={districtId}
            onChange={(e) => onDistrict(e.target.value as CityDistrictId)}
            className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
          >
            {AURENFURT_DISTRICTS.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-gray-300 hover:border-hero-border"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-2 font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50"
          >
            Ausspielen
          </button>
        </div>
      </div>
    </div>
  );
}
