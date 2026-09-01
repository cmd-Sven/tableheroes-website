/**
 * LiveSessionCharacterAvatarRadialOverlay — Portal radial menu and action panels.
 */
"use client";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Minus, Plus, X } from "lucide-react";
import {
  CHARACTER_CONDITION_DEFINITIONS,
  type CharacterConditionKey,
} from "@/src/lib/characters/condition-tokens";
import {
  clampExhaustionLevel,
  EXHAUSTION_MAX,
  formatExhaustionTooltipDe,
} from "@/src/lib/characters/dnd5e/exhaustion";
import { ExhaustionBadge } from "@/src/components/session/ExhaustionBadge";
import { MOOD_STATE_DEFINITIONS, type MoodStateKey } from "@/src/lib/characters/mood-states";
import {
  NPC_SIZE_CELLS,
  NPC_SIZE_LABELS_DE,
  parseNpcTokenSizeCategory,
  type NpcTokenSizeCategory,
} from "@/src/lib/npcs/npc-sheet-types";
import { toast } from "sonner";
import {
  announceLiveSessionSpell,
  applyLiveSessionLoadout,
  applyLiveSessionWeaponPreset,
  useLiveSessionBeltItem,
  useLiveSessionClassAbility,
  type LiveAvatarStatus,
} from "@/src/lib/actions/live-session-avatar-actions";
import {
  type AnchorRect,
  type RadialPanel,
  PANEL_TITLES,
  RADIAL_ITEMS,
} from "./live-session-character-avatar.constants";
import { LiveSessionCharacterAvatarActionList } from "./LiveSessionCharacterAvatarActionList";

export type LiveSessionCharacterAvatarRadialOverlayProps = {
  mounted: boolean;
  menuOpen: boolean;
  canInteract: boolean;
  anchor: AnchorRect | null;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  visibleRadial: (typeof RADIAL_ITEMS)[number][];
  panel: RadialPanel;
  pending: boolean;
  status: LiveAvatarStatus | null;
  isGm: boolean;
  hpCurrent: number;
  hpMax: number;
  tokenShowHpBar: boolean;
  setTokenShowHpBar: (v: boolean) => void;
  tokenSizeCategory: NpcTokenSizeCategory;
  setTokenSizeCategory: (v: NpcTokenSizeCategory) => void;
  hasBattlemapToken: boolean;
  handleRadialClick: (id: (typeof RADIAL_ITEMS)[number]["id"]) => void;
  setMenuOpen: (v: boolean) => void;
  setPanel: (v: RadialPanel) => void;
  saveMood: (moodKey: MoodStateKey | null) => void;
  toggleGmCondition: (key: CharacterConditionKey) => void;
  setGmExhaustionLevel: (level: number) => void;
  saveTokenSettings: () => void;
  runAction: (fn: () => Promise<LiveAvatarStatus | void>) => void;
  sessionId: string;
  characterId: string;
  characterName: string;
};

export function LiveSessionCharacterAvatarRadialOverlay(props: LiveSessionCharacterAvatarRadialOverlayProps) {
  const {
    mounted,
    menuOpen,
    canInteract,
    anchor,
    overlayRef,
    visibleRadial,
    panel,
    pending,
    status,
    isGm,
    hpCurrent,
    hpMax,
    tokenShowHpBar,
    setTokenShowHpBar,
    tokenSizeCategory,
    setTokenSizeCategory,
    hasBattlemapToken,
    handleRadialClick,
    setMenuOpen,
    setPanel,
    saveMood,
    toggleGmCondition,
    setGmExhaustionLevel,
    saveTokenSettings,
    runAction,
    sessionId,
    characterId,
    characterName,
  } = props;

  if (!mounted || !menuOpen || !canInteract || !anchor) return null;

  return createPortal(
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
                    <LiveSessionCharacterAvatarActionList
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
                    <LiveSessionCharacterAvatarActionList
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
                      <LiveSessionCharacterAvatarActionList
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
                                spellId: s.id,
                              });
                              toast.success(`„${s.name}" angekündigt.`);
                            }),
                        }))}
                        pending={pending}
                      />
                    )
                  ) : null}

                  {panel === "abilities" ? (
                    <LiveSessionCharacterAvatarActionList
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
                    <LiveSessionCharacterAvatarActionList
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
                    <div className="max-h-52 space-y-2 overflow-y-auto">
                      <div className="rounded border border-hero-border/50 bg-hero-dark/40 p-2">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                            Erschöpfung (2024)
                          </p>
                          <ExhaustionBadge
                            level={status?.exhaustionLevel ?? 0}
                            size="sm"
                            position="static"
                          />
                        </div>
                        <p
                          className="mb-2 whitespace-pre-line font-libre text-[10px] leading-snug text-gray-400"
                          title={formatExhaustionTooltipDe(status?.exhaustionLevel ?? 0)}
                        >
                          Stufe {clampExhaustionLevel(status?.exhaustionLevel)} / {EXHAUSTION_MAX}
                          {clampExhaustionLevel(status?.exhaustionLevel) > 0
                            ? ` · W20 & SG ${clampExhaustionLevel(status?.exhaustionLevel) * -1}`
                            : ""}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pending || clampExhaustionLevel(status?.exhaustionLevel) <= 0}
                            onClick={() =>
                              setGmExhaustionLevel(
                                clampExhaustionLevel(status?.exhaustionLevel) - 1,
                              )
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-hero-border/60 text-gray-200 hover:bg-hero-dark disabled:opacity-40"
                            title="Erschöpfung −1"
                            aria-label="Erschöpfung verringern"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={EXHAUSTION_MAX}
                            value={clampExhaustionLevel(status?.exhaustionLevel)}
                            disabled={pending}
                            onChange={(e) =>
                              setGmExhaustionLevel(Number(e.target.value) || 0)
                            }
                            className="min-w-0 flex-1 accent-amber-600"
                            aria-label="Erschöpfungsstufe"
                          />
                          <button
                            type="button"
                            disabled={
                              pending ||
                              clampExhaustionLevel(status?.exhaustionLevel) >= EXHAUSTION_MAX
                            }
                            onClick={() =>
                              setGmExhaustionLevel(
                                clampExhaustionLevel(status?.exhaustionLevel) + 1,
                              )
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded border border-hero-border/60 text-gray-200 hover:bg-hero-dark disabled:opacity-40"
                            title="Erschöpfung +1"
                            aria-label="Erschöpfung erhöhen"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="font-libre text-[10px] text-gray-500">
                        Weitere Zustände überlagern den Spieler-Gemütszustand.
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

                  {panel === "token_settings" ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm text-gray-200">
                        <input
                          type="checkbox"
                          checked={tokenShowHpBar}
                          onChange={(e) => setTokenShowHpBar(e.target.checked)}
                          disabled={pending}
                        />
                        <Heart className="h-3.5 w-3.5 text-red-400" />
                        Lebensbalken am Token
                      </label>
                      {tokenShowHpBar ? (
                        <p className="font-libre text-[10px] text-gray-500">
                          Aktuell: {hpCurrent} / {hpMax} TP
                        </p>
                      ) : null}
                      <label className="block">
                        <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                          Größe (D&amp;D 5e)
                        </span>
                        <select
                          value={tokenSizeCategory}
                          onChange={(e) =>
                            setTokenSizeCategory(parseNpcTokenSizeCategory(e.target.value))
                          }
                          disabled={pending}
                          className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
                        >
                          {(Object.keys(NPC_SIZE_LABELS_DE) as NpcTokenSizeCategory[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {NPC_SIZE_LABELS_DE[k]} ({NPC_SIZE_CELLS[k]} Feld
                                {NPC_SIZE_CELLS[k] > 1 ? "er" : ""})
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={pending || !hasBattlemapToken}
                        onClick={saveTokenSettings}
                        className="w-full rounded border border-hero-vibrant bg-hero-vibrant/15 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-40"
                      >
                        Speichern
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>,
          document.body,
        )
}
