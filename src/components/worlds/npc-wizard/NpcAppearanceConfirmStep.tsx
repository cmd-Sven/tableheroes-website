"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  detectAppearanceGaps,
  hasBlockingAppearanceGaps,
  type AppearanceGap,
} from "@/src/lib/npc-appearance-gaps";
import { buildPortraitArtStyle, type PortraitArtStyle } from "@/src/lib/npc-portrait-style";
import type { WorldBlueprint } from "@/src/types/world";

type Props = {
  appearance: string;
  onAppearanceChange: (value: string) => void;
  age: string;
  onAgeChange: (value: string) => void;
  gender: string;
  onGenderChange: (value: string) => void;
  artStyleNote: string;
  onArtStyleNoteChange: (value: string) => void;
  worldBlueprint: WorldBlueprint | null;
  appearanceConfirmed: boolean;
  onConfirm: () => void;
};

export function NpcAppearanceConfirmStep({
  appearance,
  onAppearanceChange,
  age,
  onAgeChange,
  gender,
  onGenderChange,
  artStyleNote,
  onArtStyleNoteChange,
  worldBlueprint,
  appearanceConfirmed,
  onConfirm,
}: Props) {
  const artStyle: PortraitArtStyle = buildPortraitArtStyle(worldBlueprint);
  const gaps: AppearanceGap[] = detectAppearanceGaps(appearance, { age, gender });
  const blocking = hasBlockingAppearanceGaps(gaps);
  const canConfirm = appearance.trim().length > 20 && !blocking;

  return (
    <div className="space-y-6">
      <p className="font-libre text-gray-200 text-sm">
        Bestätige das Aussehen, bevor ein Charakterportrait erzeugt wird. Fehlende Angaben wie Alter
        oder Geschlecht sollten ergänzt werden — der Stil richtet sich nach deinem Welt-Blueprint
        (Fantasy / D&D-5e-Look).
      </p>

      <div className="rounded-lg border border-accent-gold/40 bg-accent-gold/10 p-4">
        <p className="font-barlow font-bold text-xs uppercase text-accent-gold mb-1">
          Stilrichtung für das Portrait
        </p>
        <p className="font-libre text-sm text-gray-200">{artStyle.label}</p>
        <p className="font-libre text-xs text-gray-400 mt-2">
          Genre: {artStyle.genre} · Tech: {artStyle.techLevel} · Magie: {artStyle.magicPrevalence}
        </p>
      </div>

      {gaps.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 space-y-2">
          <p className="font-barlow font-bold text-xs uppercase text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Noch unklar für ein Portrait
          </p>
          <ul className="space-y-1 text-sm text-amber-100/90 font-libre">
            {gaps.map((gap) => (
              <li key={gap.id}>
                <strong>{gap.label}:</strong> {gap.hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Alter {blocking && gaps.some((g) => g.id === "age") ? "*" : "(optional)"}
          </label>
          <input
            type="text"
            value={age}
            onChange={(e) => onAgeChange(e.target.value)}
            placeholder="z. B. Mitte 40, jugendlich, greisenhaft"
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
          />
        </div>
        <div>
          <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
            Geschlecht / Präsentation {blocking && gaps.some((g) => g.id === "gender") ? "*" : ""}
          </label>
          <select
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
          >
            <option value="">— Bitte wählen —</option>
            <option value="männlich">Männlich</option>
            <option value="weiblich">Weiblich</option>
            <option value="androgyn">Androgyn / neutral</option>
            <option value="nicht-binär">Nicht-binär</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
          Aussehen (bestätigen oder anpassen)
        </label>
        <textarea
          value={appearance}
          onChange={(e) => onAppearanceChange(e.target.value)}
          rows={8}
          className="w-full rounded border-2 border-hero-border bg-slate-900 p-4 font-libre text-white text-sm leading-relaxed outline-none transition-all focus:border-accent-gold resize-y"
        />
      </div>

      <div>
        <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
          Zusätzlicher Stil-Hinweis (optional)
        </label>
        <input
          type="text"
          value={artStyleNote}
          onChange={(e) => onArtStyleNoteChange(e.target.value)}
          placeholder="z. B. düsteres Licht, leichte Elfen-Ohren betonen"
          className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm || appearanceConfirmed}
        className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {appearanceConfirmed ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Aussehen bestätigt
          </>
        ) : (
          "Aussehen bestätigen"
        )}
      </button>

      {!canConfirm && !appearanceConfirmed && (
        <p className="font-libre text-xs text-gray-500">
          Bitte ergänze mindestens Alter und Geschlecht (oder im Aussehenstext) und halte die
          Beschreibung ausreichend detailliert.
        </p>
      )}
    </div>
  );
}
