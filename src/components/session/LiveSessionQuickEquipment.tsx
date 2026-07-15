"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw, Shield, Swords } from "lucide-react";
import { toast } from "sonner";
import { getCharacterEquipmentPayload } from "@/src/lib/actions/character-inventory-actions";
import { saveLiveSessionEquipment } from "@/src/lib/actions/live-session-equipment-actions";
import {
  applyEquipmentLoadout,
  applyWeaponPreset,
} from "@/src/lib/characters/dnd5e/equipment";
import type { Dnd5eEquipmentState } from "@/src/lib/characters/dnd5e/equipment-types";
import type { CharacterItem } from "@/src/types/inventory";

type Props = {
  sessionId: string;
  characterId: string;
  characterName: string;
  disabled?: boolean;
};

export function LiveSessionQuickEquipment({
  sessionId,
  characterId,
  characterName,
  disabled,
}: Props) {
  const [open, setOpen] = useState<"weapon" | "loadout" | null>(null);
  const [equipment, setEquipment] = useState<Dnd5eEquipmentState | null>(null);
  const [items, setItems] = useState<CharacterItem[]>([]);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void getCharacterEquipmentPayload(characterId)
      .then((payload) => {
        setEquipment(payload.equipment);
        setItems(payload.items.filter((i) => !i.is_deleted));
        const names: Record<string, string> = {};
        for (const item of payload.items) names[item.id] = item.name;
        setItemNames(names);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, [open, characterId]);

  function applyWeapon(presetId: string, presetName: string) {
    if (!equipment) return;
    const next = applyWeaponPreset(equipment, presetId, items);
    startTransition(async () => {
      try {
        await saveLiveSessionEquipment({
          sessionId,
          characterId,
          characterName,
          equipment: next,
          activityText: `${characterName} wechselt Waffenkombination: „${presetName}"`,
          activityType: "player_action",
        });
        setEquipment(next);
        setOpen(null);
        toast.success("Waffenkombination gewechselt.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function applyLoadout(loadoutId: string, loadoutName: string) {
    if (!equipment) return;
    if (
      !confirm(
        `Loadout „${loadoutName}" anlegen? Laut PHB nur bei kurzer oder langer Rast erlaubt.`,
      )
    ) {
      return;
    }
    const next = applyEquipmentLoadout(equipment, loadoutId, items);
    startTransition(async () => {
      try {
        await saveLiveSessionEquipment({
          sessionId,
          characterId,
          characterName,
          equipment: next,
          activityText: `${characterName} wechselt Ausrüstung: „${loadoutName}"`,
          activityType: "player_action",
          notifyGm: true,
          gmEditSummary: `Loadout „${loadoutName}" in Live-Session aktiviert`,
        });
        setEquipment(next);
        setOpen(null);
        toast.success("Ausrüstung gewechselt — SL wurde informiert.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  if (disabled) return null;

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(open === "weapon" ? null : "weapon")}
        className="absolute -left-8 top-[118px] z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-hero-vibrant/70 bg-background-dark/90 text-hero-vibrant shadow-lg transition-transform hover:scale-110"
        title="Waffenkombination wechseln"
        aria-label="Waffenkombination wechseln"
      >
        <Swords className="h-5 w-5" />
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(open === "loadout" ? null : "loadout")}
        className="absolute -right-8 top-[118px] z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-accent-gold/70 bg-background-dark/90 text-accent-gold shadow-lg transition-transform hover:scale-110"
        title="Gespeicherte Ausrüstung wechseln"
        aria-label="Gespeicherte Ausrüstung wechseln"
      >
        <Shield className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute -left-4 top-[168px] z-[60] w-56 rounded-lg border border-hero-border bg-background-card p-2 shadow-2xl">
          <p className="mb-2 font-barlow text-[10px] font-bold uppercase text-accent-gold">
            {open === "weapon" ? "Waffenkombination" : "Ausrüstung"}
          </p>
          {loading ? (
            <p className="font-libre text-xs text-gray-500">Lädt…</p>
          ) : !equipment ? (
            <p className="font-libre text-xs text-gray-500">Keine Daten.</p>
          ) : open === "weapon" ? (
            <ul className="space-y-1">
              {(equipment.weaponPresets ?? []).length === 0 ? (
                <li className="font-libre text-xs text-gray-500">Keine Presets gespeichert.</li>
              ) : (
                (equipment.weaponPresets ?? []).map((preset) => (
                  <li key={preset.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => applyWeapon(preset.id, preset.name)}
                      className="flex w-full items-center gap-1 rounded border border-hero-border/40 px-2 py-1 text-left font-libre text-xs text-gray-200 hover:bg-hero-dark/40"
                    >
                      <RefreshCw className="h-3 w-3 shrink-0 text-hero-vibrant" />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <ul className="space-y-1">
              {(equipment.loadouts ?? []).length === 0 ? (
                <li className="font-libre text-xs text-gray-500">Keine Loadouts gespeichert.</li>
              ) : (
                (equipment.loadouts ?? []).map((loadout) => (
                  <li key={loadout.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => applyLoadout(loadout.id, loadout.name)}
                      className="flex w-full items-center gap-1 rounded border border-hero-border/40 px-2 py-1 text-left font-libre text-xs text-gray-200 hover:bg-hero-dark/40"
                    >
                      <Shield className="h-3 w-3 shrink-0 text-accent-gold" />
                      <span className="truncate">{loadout.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="mt-2 w-full font-barlow text-[9px] uppercase text-gray-500 hover:text-gray-300"
          >
            Schließen
          </button>
        </div>
      ) : null}
    </>
  );
}
