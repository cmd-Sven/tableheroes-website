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
  DND5E_WEAPON_PROPERTIES,
  metaToInventoryCategory,
  parseDnd5eMetaFromDescription,
  stripMachineTags,
  type Dnd5eItemMeta,
  type InventoryDisplayCategory,
} from "@/src/lib/characters/dnd5e/item-meta";
import {
  isStandardCategory,
  metaKindToDisplayCategory,
  patchMetaFromDisplayCategory,
  STANDARD_INVENTORY_CATEGORIES,
} from "@/src/lib/characters/dnd5e/inventory-categories";
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
    if (parsedMeta) {
      const displayCat: InventoryDisplayCategory =
        parsedMeta.inventoryCategory && isStandardCategory(parsedMeta.inventoryCategory)
          ? parsedMeta.inventoryCategory
          : metaKindToDisplayCategory(parsedMeta.kind);
      const isMagical = Boolean(parsedMeta.isMagical) || parsedMeta.kind === "magic";
      setMeta({
        ...parsedMeta,
        ...patchMetaFromDisplayCategory(displayCat, isMagical),
      });
    } else {
      setMeta({
        ...createEmptyCustomItemMeta(),
        inventoryCategory: "gear",
      });
    }
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
        const displayCat: InventoryDisplayCategory =
          meta.inventoryCategory && isStandardCategory(meta.inventoryCategory)
            ? meta.inventoryCategory
            : "gear";
        const normalizedMeta: Dnd5eItemMeta = {
          ...meta,
          ...patchMetaFromDisplayCategory(displayCat, Boolean(meta.isMagical)),
          weightLb: Math.max(0, meta.weightLb),
        };
        const description = buildItemDescription({
          tags: [CUSTOM_DND5E_TAG],
          meta: normalizedMeta,
          userText,
        });
        const category = metaToInventoryCategory(normalizedMeta);
        const saved = item
          ? await updateCharacterItem({
              itemId: item.id,
              name: trimmed,
              description,
              category,
              iconType: normalizedMeta.kind,
            })
          : await createCharacterItem({
              characterId,
              name: trimmed,
              description,
              category,
              iconType: normalizedMeta.kind,
            });
        onSaved(saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("itemEditor.saveError"));
      }
    });
  }

  const displayCategory: InventoryDisplayCategory =
    meta.inventoryCategory && isStandardCategory(meta.inventoryCategory)
      ? meta.inventoryCategory
      : "gear";
  const showWeaponFields = displayCategory === "weapons";
  const showArmorFields = displayCategory === "armor";

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
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">
              {t("inventory.categoryLabel")}
            </span>
            <select
              value={displayCategory}
              onChange={(e) => {
                const category = e.target.value as InventoryDisplayCategory;
                patchMeta(patchMetaFromDisplayCategory(category, Boolean(meta.isMagical)));
              }}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            >
              {STANDARD_INVENTORY_CATEGORIES.filter((c) => c !== "unknown").map((cat) => (
                <option key={cat} value={cat}>
                  {t(`inventory.cat.${cat}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
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
              <span className="font-barlow text-xs font-bold uppercase text-gray-500">
                {t("inventory.quantityLabel")}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={meta.quantity ?? 1}
                onChange={(e) => patchMeta({ quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-barlow text-xs font-bold uppercase text-gray-500">
                {t("inventory.valueGpLabel")}
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={meta.valueGp ?? ""}
                onChange={(e) =>
                  patchMeta({
                    valueGp: e.target.value ? Math.max(0, Number(e.target.value) || 0) : null,
                  })
                }
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">Seltenheit</span>
            <input
              value={meta.rarity ?? ""}
              onChange={(e) => patchMeta({ rarity: e.target.value })}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
              placeholder={t("itemEditor.rarityPlaceholder")}
            />
          </label>

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
                  onChange={(e) =>
                    patchMeta({
                      isShield: e.target.checked,
                      acFormula: e.target.checked ? "+2" : meta.acFormula,
                      acBonus: e.target.checked ? 2 : meta.acBonus,
                    })
                  }
                />
                Ist ein Schild (+2 RK)
              </label>
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="font-barlow text-xs font-bold uppercase text-gray-500">
              RK-Bonus (additiv)
            </span>
            <input
              type="number"
              min={0}
              max={10}
              step={1}
              value={meta.acBonus ?? ""}
              onChange={(e) =>
                patchMeta({
                  acBonus: e.target.value
                    ? Math.max(0, Math.round(Number(e.target.value) || 0))
                    : null,
                })
              }
              placeholder="z. B. 1 für Ring of Protection"
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white sm:max-w-xs"
            />
            <span className="font-libre text-[10px] text-gray-500">
              Magische Boni (Ring/Umhang der Beschützung usw.), zusätzlich zur Rüstungsformel.
            </span>
          </label>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-libre text-sm text-gray-300">
              <input
                type="checkbox"
                checked={Boolean(meta.isConsumable)}
                onChange={(e) =>
                  patchMeta({
                    isConsumable: e.target.checked,
                    kind: e.target.checked ? "consumable" : meta.kind === "consumable" ? "equipment" : meta.kind,
                  })
                }
              />
              {t("inventory.consumableLabel")}
            </label>
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
