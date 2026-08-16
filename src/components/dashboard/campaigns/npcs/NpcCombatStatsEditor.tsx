"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles, Sword } from "lucide-react";
import { ABILITY_KEYS, ABILITY_LABELS_DE } from "@/src/lib/characters/dnd5e/types";
import {
  NPC_SIZE_LABELS_DE,
  abilityMod,
  createEmptyNpcSheet,
  mergeNpcSheetWithDefaults,
  type NpcSheetData,
  type NpcTokenSizeCategory,
} from "@/src/lib/npcs/npc-sheet-types";

type Props = {
  sheet: NpcSheetData | null;
  onChange: (sheet: NpcSheetData) => void;
  /** Optional KI-Generierung */
  onGenerateAi?: (input: {
    classHint: string;
    powerTier: NpcSheetData["powerTier"];
  }) => Promise<NpcSheetData>;
  disabled?: boolean;
  compact?: boolean;
};

export function NpcCombatStatsEditor({
  sheet,
  onChange,
  onGenerateAi,
  disabled,
  compact,
}: Props) {
  const data = mergeNpcSheetWithDefaults(sheet);
  const [pending, startTransition] = useTransition();
  const [classHint, setClassHint] = useState(data.classHint ?? "");
  const [powerTier, setPowerTier] = useState<NpcSheetData["powerTier"]>(
    data.powerTier ?? "standard",
  );
  const [error, setError] = useState<string | null>(null);

  function patch(partial: Partial<NpcSheetData>) {
    onChange(mergeNpcSheetWithDefaults({ ...data, ...partial }));
  }

  function runAi() {
    if (!onGenerateAi) return;
    setError(null);
    startTransition(async () => {
      try {
        const next = await onGenerateAi({
          classHint: classHint.trim() || "Warrior",
          powerTier,
        });
        onChange(mergeNpcSheetWithDefaults(next));
        setClassHint(next.classHint ?? classHint);
        setPowerTier(next.powerTier ?? powerTier);
      } catch (e) {
        setError(e instanceof Error ? e.message : "KI-Generierung fehlgeschlagen.");
      }
    });
  }

  return (
    <div className={`space-y-4 ${compact ? "" : ""}`}>
      <div className="rounded-lg border border-accent-gold/40 bg-accent-gold/5 p-4 space-y-3">
        <p className="font-barlow text-xs font-bold uppercase text-accent-gold flex items-center gap-2">
          <Sword className="h-4 w-4" />
          Optional: D&amp;D 5e Kampfwerte (nur SL)
        </p>
        <p className="font-libre text-xs text-gray-400">
          Attribute, AC/HP und Zauber nach NPC-Regeln. Spieler sehen diese Werte nicht — nur die
          Beschreibung.
        </p>
        {onGenerateAi ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <label className="block">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Klasse / Archetyp
              </span>
              <input
                type="text"
                value={classHint}
                onChange={(e) => setClassHint(e.target.value)}
                placeholder="z. B. Veteran, Kampfmagier, Assassine"
                disabled={disabled || pending}
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                Stärke
              </span>
              <select
                value={powerTier ?? "standard"}
                onChange={(e) =>
                  setPowerTier(e.target.value as NpcSheetData["powerTier"])
                }
                disabled={disabled || pending}
                className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
              >
                <option value="minion">Minion (schwach)</option>
                <option value="standard">Standard</option>
                <option value="elite">Elite</option>
                <option value="boss">Boss / Anführer</option>
              </select>
            </label>
            <button
              type="button"
              onClick={runAi}
              disabled={disabled || pending}
              className="inline-flex items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 font-barlow text-xs font-bold uppercase text-accent-gold disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              KI-Werte
            </button>
          </div>
        ) : null}
        {error ? (
          <p className="font-libre text-xs text-red-400">{error}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            ["ac", "Rüstungsklasse (AC)", data.combat.ac],
            ["hpMax", "Trefferpunkte (max)", data.combat.hpMax],
            ["speed", "Bewegung (ft)", data.combat.speed],
          ] as const
        ).map(([key, label, value]) => (
          <label key={key} className="block">
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              {label}
            </span>
            <input
              type="number"
              value={value}
              disabled={disabled}
              onChange={(e) =>
                patch({
                  combat: {
                    ...data.combat,
                    [key]: Number(e.target.value) || 0,
                    ...(key === "hpMax"
                      ? { hpCurrent: Number(e.target.value) || 0 }
                      : {}),
                  },
                })
              }
              className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
            />
          </label>
        ))}
        <label className="block">
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
            Größe (Grid)
          </span>
          <select
            value={data.sizeCategory ?? "medium"}
            disabled={disabled}
            onChange={(e) =>
              patch({ sizeCategory: e.target.value as NpcTokenSizeCategory })
            }
            className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
          >
            {(Object.keys(NPC_SIZE_LABELS_DE) as NpcTokenSizeCategory[]).map(
              (k) => (
                <option key={k} value={k}>
                  {NPC_SIZE_LABELS_DE[k]}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
            Challenge Rating
          </span>
          <input
            type="text"
            value={data.challengeRating ?? ""}
            disabled={disabled}
            onChange={(e) => patch({ challengeRating: e.target.value })}
            className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 text-sm text-white"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-gray-400">
          Attribute
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITY_KEYS.map((key) => {
            const score = data.abilities[key]?.score ?? 10;
            return (
              <label key={key} className="block text-center">
                <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                  {ABILITY_LABELS_DE[key]}
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={score}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({
                      abilities: {
                        ...data.abilities,
                        [key]: { score: Number(e.target.value) || 10 },
                      },
                    })
                  }
                  className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-1.5 text-center text-sm text-white"
                />
                <span className="font-libre text-[10px] text-gray-500">
                  {abilityMod(score) >= 0 ? "+" : ""}
                  {abilityMod(score)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-gray-400">
          Angriffe
        </p>
        {data.attacks.length === 0 ? (
          <p className="font-libre text-xs text-gray-500 italic">Keine Angriffe</p>
        ) : (
          <ul className="space-y-2">
            {data.attacks.map((atk, idx) => (
              <li
                key={atk.id}
                className="grid gap-2 rounded border border-hero-border/40 bg-black/20 p-2 sm:grid-cols-[1fr_4rem_6rem]"
              >
                <input
                  value={atk.name}
                  disabled={disabled}
                  onChange={(e) => {
                    const attacks = [...data.attacks];
                    attacks[idx] = { ...atk, name: e.target.value };
                    patch({ attacks });
                  }}
                  className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white"
                  placeholder="Name"
                />
                <input
                  type="number"
                  value={atk.attackBonus}
                  disabled={disabled}
                  onChange={(e) => {
                    const attacks = [...data.attacks];
                    attacks[idx] = {
                      ...atk,
                      attackBonus: Number(e.target.value) || 0,
                    };
                    patch({ attacks });
                  }}
                  className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white"
                  title="Angriffsbonus"
                />
                <input
                  value={atk.damage}
                  disabled={disabled}
                  onChange={(e) => {
                    const attacks = [...data.attacks];
                    attacks[idx] = { ...atk, damage: e.target.value };
                    patch({ attacks });
                  }}
                  className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white"
                  placeholder="1d8+3"
                />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            patch({
              attacks: [
                ...data.attacks,
                {
                  id: crypto.randomUUID(),
                  name: "Angriff",
                  attackBonus: 4,
                  damage: "1d8+2",
                },
              ],
            })
          }
          className="mt-2 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:underline"
        >
          + Angriff
        </button>
      </div>

      <div>
        <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-gray-400">
          Zauber
        </p>
        {data.spells.length === 0 ? (
          <p className="font-libre text-xs text-gray-500 italic">Keine Zauber</p>
        ) : (
          <ul className="space-y-2">
            {data.spells.map((sp, idx) => (
              <li
                key={sp.id}
                className="grid gap-2 rounded border border-hero-border/40 bg-black/20 p-2 sm:grid-cols-[1fr_4rem]"
              >
                <input
                  value={sp.name}
                  disabled={disabled}
                  onChange={(e) => {
                    const spells = [...data.spells];
                    spells[idx] = { ...sp, name: e.target.value };
                    patch({ spells });
                  }}
                  className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white"
                />
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={sp.level}
                  disabled={disabled}
                  onChange={(e) => {
                    const spells = [...data.spells];
                    spells[idx] = { ...sp, level: Number(e.target.value) || 0 };
                    patch({ spells });
                  }}
                  className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white"
                  title="Stufe"
                />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            patch({
              spells: [
                ...data.spells,
                {
                  id: crypto.randomUUID(),
                  name: "Zauber",
                  level: 1,
                },
              ],
            })
          }
          className="mt-2 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:underline"
        >
          + Zauber
        </button>
      </div>

      {!sheet ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(createEmptyNpcSheet())}
          className="font-barlow text-xs font-bold uppercase text-gray-400 hover:text-white"
        >
          Leeren Statblock anlegen
        </button>
      ) : null}
    </div>
  );
}
