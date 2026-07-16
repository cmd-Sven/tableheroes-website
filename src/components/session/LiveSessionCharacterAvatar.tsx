"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Package,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import {
  announceLiveSessionSpell,
  applyLiveSessionLoadout,
  applyLiveSessionWeaponPreset,
  getLiveSessionAvatarStatus,
  useLiveSessionBeltItem,
  useLiveSessionClassAbility,
  type LiveAvatarStatus,
} from "@/src/lib/actions/live-session-avatar-actions";

type RadialPanel = "weapons" | "loadouts" | "spells" | "abilities" | "belt" | null;

function isCasterHeuristic(className: string | null): boolean {
  const c = (className ?? "").toLowerCase();
  return /magier|wizard|zauberer|sorcerer|kleriker|cleric|paladin|barde|bard|hexer|warlock|druide|druid|waldläufer|ranger|artificer/.test(
    c,
  );
}

function hasClassAbilitiesHeuristic(className: string | null): boolean {
  const c = (className ?? "").toLowerCase();
  return /barbar|barbarian|kämpfer|fighter|mönch|monk|kleriker|cleric|paladin|barde|bard|hexer|warlock|zauberer|sorcerer|druide|druid/.test(
    c,
  );
}

type Props = {
  sessionId: string;
  campaignId: string;
  characterId: string;
  characterName: string;
  className: string | null;
  fallbackAvatarUrl: string | null;
  avatarDisplay?: unknown | null;
  isDummy?: boolean;
  canInteract: boolean;
  showDnd5eSheet: boolean;
};

const RADIAL_ITEMS: {
  id: Exclude<RadialPanel, null> | "sheet";
  label: string;
  Icon: typeof Swords;
  angle: number;
  casterOnly?: boolean;
  abilitiesOnly?: boolean;
}[] = [
  { id: "sheet", label: "Charakterblatt", Icon: ScrollText, angle: -90 },
  { id: "weapons", label: "Waffenset", Icon: Swords, angle: -30 },
  { id: "loadouts", label: "Ausrüstungsset", Icon: Shield, angle: 30 },
  { id: "spells", label: "Zauberbuch", Icon: BookOpen, angle: 90, casterOnly: true },
  { id: "abilities", label: "Klassenfähigkeiten", Icon: Sparkles, angle: 150, abilitiesOnly: true },
  { id: "belt", label: "Gürtel", Icon: Package, angle: 210 },
];

export function LiveSessionCharacterAvatar({
  sessionId,
  campaignId,
  characterId,
  characterName,
  className,
  fallbackAvatarUrl,
  avatarDisplay,
  isDummy,
  canInteract,
  showDnd5eSheet,
}: Props) {
  const [status, setStatus] = useState<LiveAvatarStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<RadialPanel>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    if (isDummy) return;
    try {
      const next = await getLiveSessionAvatarStatus(characterId);
      setStatus(next);
    } catch {
      /* Anzeige fällt auf Fallback zurück */
    }
  }, [characterId, isDummy]);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPanel(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setPanel(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const avatarUrl = status?.displayAvatarUrl || fallbackAvatarUrl;
  const hpCurrent = status?.hpCurrent ?? 0;
  const hpMax = Math.max(1, status?.hpMax ?? 1);
  const hpPct = Math.min(100, Math.round((hpCurrent / hpMax) * 100));
  const weaponLine =
    status?.weaponLabels?.length ? status.weaponLabels.join(" · ") : "Keine Waffe";

  const visibleRadial = useMemo(() => {
    const filtered = RADIAL_ITEMS.filter((item) => {
      if (item.id === "sheet") return showDnd5eSheet;
      if (item.casterOnly) return Boolean(status?.isCaster ?? isCasterHeuristic(className));
      if (item.abilitiesOnly) {
        if ((status?.classResources?.length ?? 0) > 0) return true;
        return hasClassAbilitiesHeuristic(className);
      }
      return true;
    });
    const count = filtered.length;
    if (count === 0) return filtered;
    return filtered.map((item, index) => ({
      ...item,
      angle: -90 + (360 / count) * index,
    }));
  }, [status, className, showDnd5eSheet]);

  function openSheetTab() {
    window.open(
      `/dashboard/campaigns/${campaignId}/characters/${characterId}/player-view`,
      "_blank",
      "noopener,noreferrer",
    );
    setMenuOpen(false);
    setPanel(null);
  }

  function handleRadialClick(id: (typeof RADIAL_ITEMS)[number]["id"]) {
    if (id === "sheet") {
      openSheetTab();
      return;
    }
    setPanel((prev) => (prev === id ? null : id));
  }

  function runAction(fn: () => Promise<LiveAvatarStatus | void>) {
    startTransition(async () => {
      try {
        const next = await fn();
        if (next) setStatus(next);
        else await reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col items-center">
      {/* Interaktionsfläche: Avatar */}
      <button
        type="button"
        disabled={!canInteract || isDummy}
        onClick={() => {
          if (!canInteract || isDummy) return;
          setMenuOpen((v) => !v);
          setPanel(null);
          void reload();
        }}
        className={`relative z-10 flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-hero-dark shadow-xl transition-transform ${
          isDummy ? "border-dashed border-amber-600/90" : "border-amber-800/80"
        } ${canInteract && !isDummy ? "cursor-pointer hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-accent-gold" : "cursor-default"}`}
        title={canInteract && !isDummy ? `${characterName} — Aktionen` : characterName}
        aria-label={canInteract && !isDummy ? `Aktionen für ${characterName}` : characterName}
      >
        {avatarUrl ? (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <CharacterAvatarImage
              src={avatarUrl}
              avatarDisplay={avatarDisplay}
              className="h-full w-full"
              alt={characterName}
            />
          </div>
        ) : (
          <span className="font-barlow text-4xl text-accent-gold">
            {characterName[0]?.toUpperCase()}
          </span>
        )}
      </button>

      {/* Display: Waffen + HP — keine Interaktion */}
      {!isDummy ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[-6px] z-20 flex flex-col items-center gap-1 px-2">
          <p
            className="max-w-[200px] truncate rounded bg-black/65 px-2 py-0.5 text-center font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold"
            title={weaponLine}
          >
            <Swords className="mr-1 inline h-3 w-3" />
            {weaponLine}
          </p>
          <div className="w-[150px] rounded-full border border-black/40 bg-black/70 p-0.5 shadow-md">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-red-950/80">
              <div
                className={`h-full transition-[width] ${
                  hpPct > 50 ? "bg-hero-vibrant" : hpPct > 25 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <p className="mt-0.5 text-center font-barlow text-[8px] font-bold text-white/90">
              {hpCurrent}/{hpMax}
              {status && status.hpTemp > 0 ? ` (+${status.hpTemp})` : ""} TP
            </p>
          </div>
        </div>
      ) : null}

      {/* Radmenü */}
      <AnimatePresence>
        {menuOpen && canInteract ? (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[72px] z-40"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
          >
            {visibleRadial.map((item) => {
              const radius = 92;
              const rad = (item.angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;
              const Icon = item.Icon;
              const active = panel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={pending}
                  onClick={() => handleRadialClick(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  className={`pointer-events-auto absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-xl transition-transform hover:scale-110 ${
                    active
                      ? "border-hero-vibrant bg-hero-vibrant/25 text-hero-vibrant"
                      : "border-amber-700/80 bg-background-dark/95 text-accent-gold"
                  }`}
                  style={{ left: x, top: y }}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPanel(null);
              }}
              className="pointer-events-auto absolute left-0 top-0 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-600 bg-background-card text-gray-400"
              title="Schließen"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Untermenü-Panel */}
      <AnimatePresence>
        {panel ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute left-1/2 top-[210px] z-50 w-56 -translate-x-1/2 rounded-lg border border-hero-border bg-background-card p-2 shadow-2xl"
          >
            <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
              {panel === "weapons"
                ? "Waffenset"
                : panel === "loadouts"
                  ? "Ausrüstungsset"
                  : panel === "spells"
                    ? "Zauberbuch"
                    : panel === "abilities"
                      ? "Klassenfähigkeiten"
                      : "Gürtel"}
            </p>

            {panel === "weapons" ? (
              <ActionList
                empty="Keine Waffenkombination gespeichert."
                items={(status?.weaponPresets ?? []).map((p) => ({
                  id: p.id,
                  label: p.name,
                  onClick: () =>
                    runAction(() =>
                      applyLiveSessionWeaponPreset({
                        sessionId,
                        characterId,
                        characterName,
                        presetId: p.id,
                      }),
                    ),
                }))}
                pending={pending}
              />
            ) : null}

            {panel === "loadouts" ? (
              <ActionList
                empty="Kein Ausrüstungsset gespeichert."
                items={(status?.loadouts ?? []).map((l) => ({
                  id: l.id,
                  label: l.name,
                  onClick: () => {
                    if (
                      !confirm(
                        `Loadout „${l.name}" anwenden? Laut PHB nur bei kurzer oder langer Rast.`,
                      )
                    ) {
                      return;
                    }
                    runAction(() =>
                      applyLiveSessionLoadout({
                        sessionId,
                        characterId,
                        characterName,
                        loadoutId: l.id,
                      }),
                    );
                  },
                }))}
                pending={pending}
              />
            ) : null}

            {panel === "spells" ? (
              (status?.spells ?? []).length === 0 ? (
                <p className="font-libre text-xs text-gray-500 italic">
                  Zauberbuch folgt — Zauber werden später integriert.
                </p>
              ) : (
                <ActionList
                  empty=""
                  items={(status?.spells ?? []).map((s) => ({
                    id: s.id,
                    label: s.name,
                    onClick: () =>
                      runAction(async () => {
                        await announceLiveSessionSpell({
                          sessionId,
                          characterId,
                          characterName,
                          spellName: s.name,
                        });
                        toast.success(`„${s.name}" angekündigt.`);
                      }),
                  }))}
                  pending={pending}
                />
              )
            ) : null}

            {panel === "abilities" ? (
              <ActionList
                empty="Keine Klassenfähigkeiten."
                items={(status?.classResources ?? []).map((r) => ({
                  id: r.id,
                  label: `${r.label} (${r.current}/${r.max})`,
                  disabled: r.current <= 0,
                  onClick: () =>
                    runAction(() =>
                      useLiveSessionClassAbility({
                        sessionId,
                        characterId,
                        characterName,
                        resourceId: r.id,
                      }),
                    ),
                }))}
                pending={pending}
              />
            ) : null}

            {panel === "belt" ? (
              <ActionList
                empty="Gürtel ist leer."
                items={(status?.beltItems ?? []).map((b) => ({
                  id: b.id,
                  label: `${b.name}${b.quantity > 1 ? ` ×${b.quantity}` : ""}${
                    b.isConsumable ? " · Verbrauch" : ""
                  }`,
                  onClick: () =>
                    runAction(() =>
                      useLiveSessionBeltItem({
                        sessionId,
                        characterId,
                        characterName,
                        itemId: b.id,
                      }),
                    ),
                }))}
                pending={pending}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ActionList({
  items,
  empty,
  pending,
}: {
  items: { id: string; label: string; onClick: () => void; disabled?: boolean }[];
  empty: string;
  pending: boolean;
}) {
  if (items.length === 0) {
    return <p className="font-libre text-xs text-gray-500 italic">{empty}</p>;
  }
  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={pending || item.disabled}
            onClick={item.onClick}
            className="w-full rounded border border-hero-border/40 px-2 py-1.5 text-left font-libre text-xs text-gray-200 hover:bg-hero-dark/50 disabled:opacity-40"
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
