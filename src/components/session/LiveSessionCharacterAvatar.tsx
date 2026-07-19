"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  MapPin,
  Package,
  ScrollText,
  Shield,
  ShieldAlert,
  Smile,
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
import {
  setCharacterMoodState,
  toggleCharacterActiveCondition,
} from "@/src/app/dashboard/campaigns/[id]/character-state-actions";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  type CharacterConditionKey,
} from "@/src/lib/characters/condition-tokens";
import {
  MOOD_STATE_DEFINITIONS,
  type MoodStateKey,
} from "@/src/lib/characters/mood-states";
import {
  AVATAR_ROLL_FX_DURATION_MS,
  AVATAR_ROLL_FX_EVENT,
  moodKeyForRollFx,
  type AvatarRollFxDetail,
  type AvatarRollFxKind,
} from "@/src/lib/session/avatar-roll-fx";
import {
  AVATAR_SPEECH_BUBBLE_DURATION_MS,
  AVATAR_SPEECH_BUBBLE_EVENT,
  type AvatarSpeechBubbleDetail,
  type AvatarSpeechBubbleKind,
} from "@/src/lib/session/avatar-speech-bubble";
import {
  getPlayerColorForClass,
  playerColorAlpha,
} from "@/src/lib/session/class-player-color";

type RadialPanel =
  | "weapons"
  | "loadouts"
  | "spells"
  | "abilities"
  | "belt"
  | "mood"
  | "gm_state"
  | null;

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
  /** SL darf Zustände setzen (überlagert Spieler-Gemüt). */
  isGm?: boolean;
  showDnd5eSheet: boolean;
  /** Battlemap aktiv — Rad-Menü „Token setzen“. */
  battlemapActive?: boolean;
  onStartTokenPlacement?: () => void;
};

const RADIAL_ITEMS: {
  id: Exclude<RadialPanel, null> | "sheet" | "token";
  label: string;
  Icon: typeof Swords;
  angle: number;
  casterOnly?: boolean;
  abilitiesOnly?: boolean;
  moodOnly?: boolean;
  gmOnly?: boolean;
  tokenOnly?: boolean;
}[] = [
  { id: "sheet", label: "Charakterblatt", Icon: ScrollText, angle: -90 },
  { id: "mood", label: "Gemütszustand", Icon: Smile, angle: -45, moodOnly: true },
  { id: "gm_state", label: "Zustand (SL)", Icon: ShieldAlert, angle: -15, gmOnly: true },
  { id: "weapons", label: "Waffenset", Icon: Swords, angle: 30 },
  { id: "loadouts", label: "Ausrüstungsset", Icon: Shield, angle: 75 },
  { id: "spells", label: "Zauberbuch", Icon: BookOpen, angle: 120, casterOnly: true },
  { id: "abilities", label: "Klassenfähigkeiten", Icon: Sparkles, angle: 165, abilitiesOnly: true },
  { id: "belt", label: "Gürtel", Icon: Package, angle: 210 },
  { id: "token", label: "Token setzen", Icon: MapPin, angle: 255, tokenOnly: true },
];

const PANEL_TITLES: Record<Exclude<RadialPanel, null>, string> = {
  weapons: "Waffenset",
  loadouts: "Ausrüstungsset",
  spells: "Zauberbuch",
  abilities: "Klassenfähigkeiten",
  belt: "Gürtel",
  mood: "Gemütszustand auswählen",
  gm_state: "Zustand zuweisen (SL)",
};

type AnchorRect = { cx: number; cy: number; top: number; width: number; height: number };

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
  isGm = false,
  showDnd5eSheet,
  battlemapActive = false,
  onStartTokenPlacement,
}: Props) {
  const [status, setStatus] = useState<LiveAvatarStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<RadialPanel>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const [rollFx, setRollFx] = useState<{
    kind: AvatarRollFxKind;
    moodKey: MoodStateKey;
    endsAt: number;
  } | null>(null);
  const [speechBubble, setSpeechBubble] = useState<{
    kind: AvatarSpeechBubbleKind;
    text: string;
    key: string;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rollFxTimerRef = useRef<number | null>(null);
  const speechBubbleTimerRef = useRef<number | null>(null);
  const seenRollFxIdsRef = useRef<Set<string>>(new Set());
  const seenSpeechBubbleIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function rememberSourceId(set: Set<string>, sourceId: string | undefined): boolean {
      if (!sourceId) return false;
      if (set.has(sourceId)) return true;
      set.add(sourceId);
      if (set.size > 40) {
        const oldest = set.values().next().value;
        if (oldest) set.delete(oldest);
      }
      return false;
    }

    function onRollFx(e: Event) {
      const detail = (e as CustomEvent<AvatarRollFxDetail>).detail;
      if (!detail || detail.characterId !== characterId) return;
      if (rememberSourceId(seenRollFxIdsRef.current, detail.sourceId)) return;
      const duration = detail.durationMs ?? AVATAR_ROLL_FX_DURATION_MS;
      const moodKey = moodKeyForRollFx(detail.kind);
      setRollFx({ kind: detail.kind, moodKey, endsAt: Date.now() + duration });
      if (rollFxTimerRef.current != null) window.clearTimeout(rollFxTimerRef.current);
      rollFxTimerRef.current = window.setTimeout(() => {
        setRollFx(null);
        rollFxTimerRef.current = null;
      }, duration);
    }

    function onSpeechBubble(e: Event) {
      const detail = (e as CustomEvent<AvatarSpeechBubbleDetail>).detail;
      if (!detail || detail.characterId !== characterId) return;
      if (rememberSourceId(seenSpeechBubbleIdsRef.current, detail.sourceId)) return;
      const duration = detail.durationMs ?? AVATAR_SPEECH_BUBBLE_DURATION_MS;
      const key = detail.sourceId ?? `${Date.now()}-${detail.text}`;
      setSpeechBubble({ kind: detail.kind, text: detail.text, key });
      if (speechBubbleTimerRef.current != null) window.clearTimeout(speechBubbleTimerRef.current);
      speechBubbleTimerRef.current = window.setTimeout(() => {
        setSpeechBubble(null);
        speechBubbleTimerRef.current = null;
      }, duration);
    }

    window.addEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
    window.addEventListener(AVATAR_SPEECH_BUBBLE_EVENT, onSpeechBubble);
    return () => {
      window.removeEventListener(AVATAR_ROLL_FX_EVENT, onRollFx);
      window.removeEventListener(AVATAR_SPEECH_BUBBLE_EVENT, onSpeechBubble);
      if (rollFxTimerRef.current != null) window.clearTimeout(rollFxTimerRef.current);
      if (speechBubbleTimerRef.current != null) window.clearTimeout(speechBubbleTimerRef.current);
    };
  }, [characterId]);

  const reload = useCallback(async () => {
    if (isDummy) return;
    try {
      const next = await getLiveSessionAvatarStatus(characterId);
      setStatus(next);
    } catch {
      /* Anzeige fällt auf Fallback zurück */
    }
  }, [characterId, isDummy]);

  const updateAnchor = useCallback(() => {
    const el = avatarBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      top: r.top,
      width: r.width,
      height: r.height,
    });
  }, []);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 20000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!menuOpen) return;
    updateAnchor();
    function onScrollOrResize() {
      updateAnchor();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen, updateAnchor]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (overlayRef.current?.contains(target)) return;
      if (avatarBtnRef.current?.contains(target)) return;
      setMenuOpen(false);
      setPanel(null);
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

  const avatarUrl = (() => {
    if (rollFx) {
      const fxUrl = status?.moodTokenUrls?.[rollFx.moodKey]?.trim();
      if (fxUrl) return fxUrl;
    }
    return status?.displayAvatarUrl || fallbackAvatarUrl;
  })();
  const fxMoodLabel = rollFx
    ? MOOD_STATE_DEFINITIONS.find((d) => d.key === rollFx.moodKey)?.labelDe ?? rollFx.moodKey
    : null;
  const isCritFx = rollFx?.kind === "crit";
  const hpCurrent = status?.hpCurrent ?? 0;
  const hpMax = Math.max(1, status?.hpMax ?? 1);
  const hpPct = Math.min(100, Math.round((hpCurrent / hpMax) * 100));
  const weaponLine =
    status?.weaponLabels?.length ? status.weaponLabels.join(" · ") : "Keine Waffe";
  const playerColor = getPlayerColorForClass(className);

  const visibleRadial = useMemo(() => {
    const filtered = RADIAL_ITEMS.filter((item) => {
      if (item.id === "sheet") return showDnd5eSheet;
      if (item.moodOnly) return true;
      if (item.gmOnly) return isGm;
      if (item.tokenOnly) return battlemapActive && Boolean(onStartTokenPlacement);
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
  }, [status, className, showDnd5eSheet, isGm, battlemapActive, onStartTokenPlacement]);

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
    if (id === "token") {
      onStartTokenPlacement?.();
      setMenuOpen(false);
      setPanel(null);
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

  function saveMood(moodKey: MoodStateKey | null) {
    startTransition(async () => {
      try {
        const result = await setCharacterMoodState({
          campaignId,
          characterId,
          moodKey,
        });
        if (!result.success) {
          toast.error(result.error ?? "Gemütszustand konnte nicht gespeichert werden.");
          return;
        }
        await reload();
        toast.success(
          moodKey
            ? `Gemüt: ${MOOD_STATE_DEFINITIONS.find((d) => d.key === moodKey)?.labelDe ?? moodKey}`
            : "Gemütszustand zurückgesetzt.",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gemütszustand fehlgeschlagen.");
      }
    });
  }

  function toggleGmCondition(conditionKey: CharacterConditionKey) {
    if (!isGm) return;
    startTransition(async () => {
      try {
        const result = await toggleCharacterActiveCondition({
          campaignId,
          characterId,
          conditionKey,
        });
        if (!result.success) {
          toast.error(result.error ?? "Zustand konnte nicht gesetzt werden.");
          return;
        }
        await reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Zustand fehlgeschlagen.");
      }
    });
  }

  const overlay =
    mounted && menuOpen && canInteract && anchor
      ? createPortal(
          <div
            ref={overlayRef}
            className="pointer-events-none fixed inset-0 z-[220]"
            aria-hidden={false}
          >
            <AnimatePresence>
              <motion.div
                key="radial"
                className="pointer-events-none absolute"
                style={{ left: anchor.cx, top: anchor.cy }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2 }}
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
            </AnimatePresence>

            <AnimatePresence>
              {panel ? (
                <motion.div
                  key={panel}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="pointer-events-auto absolute w-60 -translate-x-1/2 rounded-lg border border-hero-border bg-background-card p-2 shadow-2xl"
                  style={{
                    left: anchor.cx,
                    bottom: `calc(100vh - ${anchor.top}px + 12px)`,
                  }}
                >
                  <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                    {PANEL_TITLES[panel]}
                  </p>

                  {status?.displaySource === "gm_condition" && panel === "mood" ? (
                    <p className="mb-2 font-libre text-[10px] leading-snug text-amber-200/90">
                      Ein SL-Zustand überdeckt aktuell dein Gemüt. Das Gemüt bleibt gespeichert.
                    </p>
                  ) : null}

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

                  {panel === "mood" ? (
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => saveMood(null)}
                        className={`w-full rounded border px-2 py-1.5 text-left font-libre text-xs hover:bg-hero-dark/50 disabled:opacity-40 ${
                          !status?.moodState
                            ? "border-hero-vibrant/60 bg-hero-vibrant/10 text-hero-vibrant"
                            : "border-hero-border/40 text-gray-400"
                        }`}
                      >
                        Neutral (Basis)
                      </button>
                      {MOOD_STATE_DEFINITIONS.map((def) => {
                        const selected = status?.moodState === def.key;
                        const hasToken = Boolean(status?.moodTokenUrls?.[def.key]);
                        return (
                          <button
                            key={def.key}
                            type="button"
                            disabled={pending}
                            onClick={() => saveMood(def.key)}
                            className={`w-full rounded border px-2 py-1.5 text-left font-libre text-xs hover:bg-hero-dark/50 disabled:opacity-40 ${
                              selected
                                ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold"
                                : "border-hero-border/40 text-gray-200"
                            }`}
                          >
                            {def.labelDe}
                            {selected ? " · Aktiv" : ""}
                            {!hasToken ? " · ohne Bild" : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {panel === "gm_state" && isGm ? (
                    <div className="max-h-52 space-y-1 overflow-y-auto">
                      <p className="mb-1 font-libre text-[10px] text-gray-500">
                        Überlagert immer den Spieler-Gemütszustand.
                      </p>
                      {CHARACTER_CONDITION_DEFINITIONS.map((def) => {
                        const active = (status?.activeConditions ?? []).includes(def.key);
                        return (
                          <button
                            key={def.key}
                            type="button"
                            disabled={pending}
                            onClick={() => toggleGmCondition(def.key)}
                            aria-pressed={active}
                            className={`w-full rounded border px-2 py-1.5 text-left font-libre text-xs hover:bg-hero-dark/50 disabled:opacity-40 ${
                              active
                                ? "border-accent-gold/70 bg-accent-gold/15 text-accent-gold"
                                : "border-hero-border/40 text-gray-200"
                            }`}
                          >
                            {def.labelDe}
                            {active ? " · Aktiv" : ""}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative flex h-full w-full flex-col items-center">
      {/* Feste Höhe über dem Avatar → kein CLS beim Einblenden */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-1 flex h-[3.25rem] w-[11.5rem] -translate-x-1/2 items-end justify-center">
        <AnimatePresence mode="wait">
          {speechBubble ? (
            <motion.div
              key={speechBubble.key}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="relative max-w-full"
            >
              <div
                className={`rounded-lg border px-2.5 py-1.5 shadow-lg ${
                  speechBubble.kind === "dice"
                    ? "bg-background-dark/95 text-accent-gold"
                    : "bg-background-card/95 text-gray-100"
                }`}
                style={{
                  borderColor: playerColor,
                  boxShadow: `0 8px 24px ${playerColorAlpha(playerColor, 0.35)}`,
                }}
              >
                <p
                  className={`text-center leading-snug ${
                    speechBubble.kind === "dice"
                      ? "font-barlow text-xs font-bold uppercase tracking-wide"
                      : "font-libre text-[11px]"
                  }`}
                >
                  {speechBubble.text}
                </p>
              </div>
              <span
                aria-hidden
                className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent"
                style={{ borderTopColor: playerColor }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <motion.button
        ref={avatarBtnRef}
        type="button"
        disabled={!canInteract || isDummy}
        onClick={() => {
          if (!canInteract || isDummy) return;
          setMenuOpen((v) => !v);
          setPanel(null);
          requestAnimationFrame(() => updateAnchor());
          void reload();
        }}
        animate={{
          scale: isCritFx ? 1.28 : 1,
          opacity: 1,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative z-10 flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-hero-dark shadow-xl ${
          isDummy ? "border-dashed border-amber-600/90" : isCritFx ? "border-accent-gold" : ""
        } ${canInteract && !isDummy ? "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent-gold" : "cursor-default"}`}
        style={
          isDummy || isCritFx
            ? undefined
            : {
                borderColor: playerColor,
                boxShadow: `0 0 0 2px ${playerColorAlpha(playerColor, 0.35)}, 0 10px 28px rgba(0,0,0,0.45)`,
              }
        }
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
        {rollFx && !status?.moodTokenUrls?.[rollFx.moodKey] ? (
          <span className="pointer-events-none absolute inset-x-1 bottom-2 z-10 rounded bg-black/75 px-1 py-0.5 text-center font-barlow text-[8px] font-bold uppercase leading-tight text-accent-gold">
            {fxMoodLabel}
          </span>
        ) : null}
      </motion.button>

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

      {overlay}
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
