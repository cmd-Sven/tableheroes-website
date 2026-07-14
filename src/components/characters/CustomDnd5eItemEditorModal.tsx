"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  createCharacterItem,
  updateCharacterItem,
} from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem } from "@/src/types/inventory";
import {
  buildItemDescription,
  createEmptyCustomItemMeta,
  CUSTOM_DND5E_TAG,
  DND5E_DAMAGE_TYPES,
  DND5E_ITEM_KIND_OPTIONS,
  DND5E_WEAPON_PROPERTIES,
  metaToInventoryCategory,
  parseDnd5eMetaFromDescription,
  stripMachineTags,
  type Dnd5eItemMeta,
} from "@/src/lib/characters/dnd5e/item-meta";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  characterId: string;
  item: CharacterItem | null;
  onClose: () => void;
  onSaved: (item: CharacterItem) => void;
};

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 font-barlow text-[10px] uppercase transition-colors ${
        active
          ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
          : "border-hero-border text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

export function CustomDnd5eItemEditorModal({
  characterId,
  item,
  onClose,
  onSaved,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [name, setName] = useState("");
  const [userText, setUserText] = useState("");
  const [meta, setMeta] = useState<Dnd5eItemMeta>(createEmptyCustomItemMeta());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(item?.name ?? "");
    const parsedMeta = parseDnd5eMetaFromDescription(item?.description);
    setMeta(parsedMeta ?? createEmptyCustomItemMeta());
    setUserText(item?.description ? stripMachineTags(item.description) : "");
    setError(null);
  }, [item]);

  function patchMeta(patch: Partial<Dnd5eItemMeta>) {
    setMeta((prev) => ({ ...prev, ...patch }));
  }

  function toggleProperty(prop: string) {
    setMeta((prev) => {
      const set = new Set(prev.properties ?? []);
      if (set.has(prop)) set.delete(prop);
      else set.add(prop);
      return { ...prev, properties: [...set] };
    });
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("itemEditor.nameMissing"));
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const description = buildItemDescription({
          tags: [CUSTOM_DND5E_TAG],
          meta: { ...meta, weightLb: Math.max(0, meta.weightLb) },
          userText,
        });
        const category = metaToInventoryCategory(meta);
        const saved = item
          ? await updateCharacterItem({
              itemId: item.id,
              name: trimmed,
              description,
              category,
              iconType: meta.kind,
            })
          : await createCharacterItem({
              characterId,
              name: trimmed,
              description,
              category,
              iconType: meta.kind,
            });
        onSaved(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("itemEditor.saveError"));
      }
    });
  }

  const showWeaponFields = meta.kind === "weapon";
  const showArmorFields = meta.kind === "armor";

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-hero-border bg-background-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hero-border bg-background-card px-5 py-4">
          <div>
            <h2 className="font-barlow text-lg font-extrabold uppercase tracking-wide text-accent-gold">
              {item ? t("itemEditor.titleEdit") : t("itemEditor.titleNew")}
            </h2>
            <p className="font-libre text-xs text-gray-400">
              Nach PHB-Regeln: Gewicht, Schaden, RK, Einstimmung usw.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-hero-dark hover:text-white"
            aria-label={t("condition.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block space-y-1">
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              placeholder="z. B. Langschwert +1"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">Art</span>
            <select
              value={meta.kind}
              onChange={(e) =>
                patchMeta({
                  kind: e.target.value as Dnd5eItemMeta["kind"],
                  isMagical: e.target.value === "magic",
                })
              }
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            >
              {DND5E_ITEM_KIND_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="font-barlow text-xs font-bold uppercase text-gray-500">
                Gewicht (lb)
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={meta.weightLb}
                onChange={(e) => patchMeta({ weightLb: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-barlow text-xs font-bold uppercase text-gray-500">Seltenheit</span>
              <input
                value={meta.rarity ?? ""}
                onChange={(e) => patchMeta({ rarity: e.target.value })}
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                placeholder={t("itemEditor.rarityPlaceholder")}
              />
            </label>
          </div>

          {showWeaponFields ? (
            <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3 space-y-3">
              <p className="font-barlow text-xs font-bold uppercase text-accent-gold">Waffe</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">Schaden</span>
                  <input
                    value={meta.damage ?? ""}
                    onChange={(e) => patchMeta({ damage: e.target.value })}
                    placeholder="1d8"
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">Schadensart</span>
                  <select
                    value={meta.damageType ?? ""}
                    onChange={(e) =>
                      patchMeta({
                        damageType: (e.target.value || null) as Dnd5eItemMeta["damageType"],
                      })
                    }
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                  >
                    <option value="">—</option>
                    {DND5E_DAMAGE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">
                    Reichweite (m)
                  </span>
                  <input
                    value={meta.rangeMeters ?? ""}
                    onChange={(e) => patchMeta({ rangeMeters: e.target.value || null })}
                    placeholder="1,5 oder 24/96"
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 font-barlow text-[10px] uppercase text-gray-500">Eigenschaften</p>
                <div className="flex flex-wrap gap-1.5">
                  {DND5E_WEAPON_PROPERTIES.map((prop) => (
                    <ToggleChip
                      key={prop}
                      label={prop}
                      active={(meta.properties ?? []).includes(prop)}
                      onClick={() => toggleProperty(prop)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {showArmorFields ? (
            <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3 space-y-3">
              <p className="font-barlow text-xs font-bold uppercase text-accent-gold">Rüstung / Schild</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">RK-Formel</span>
                  <input
                    value={meta.acFormula ?? ""}
                    onChange={(e) => patchMeta({ acFormula: e.target.value || null })}
                    placeholder="14 + GES (max 2) oder +2"
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-500">STR-Anforderung</span>
                  <input
                    type="number"
                    min={0}
                    value={meta.strRequirement ?? ""}
                    onChange={(e) =>
                      patchMeta({
                        strRequirement: e.target.value ? Math.max(0, Number(e.target.value)) : null,
                      })
                    }
                    className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(meta.isShield)}
                  onChange={(e) => patchMeta({ isShield: e.target.checked, acFormula: e.target.checked ? "+2" : meta.acFormula })}
                />
                Ist ein Schild (+2 RK)
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(meta.isMagical)}
                onChange={(e) => patchMeta({ isMagical: e.target.checked })}
              />
              Magisch
            </label>
            <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(meta.attunement)}
                onChange={(e) => patchMeta({ attunement: e.target.checked, isMagical: e.target.checked ? true : meta.isMagical })}
              />
              Einstimmung erforderlich
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">
              Beschreibung / Effekt
            </span>
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              rows={4}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              placeholder={t("itemEditor.descriptionPlaceholder")}
            />
          </label>

          {error ? <p className="font-libre text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-hero-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-gray-400"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-black disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
