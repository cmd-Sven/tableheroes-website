"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Backpack,
  Loader2,
  Package,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Swords,
  Shield,
  Trash2,
} from "lucide-react";
import {
  deleteCharacterItem,
  getCharacterInventory,
} from "@/src/lib/actions/character-inventory-actions";
import type { CharacterItem, CharacterInventoryPayload } from "@/src/types/inventory";
import type { Dnd5eDerivedSheet, Dnd5eSheetData } from "@/src/lib/characters/dnd5e/types";
import {
  type Dnd5eEquipmentContainer,
  type Dnd5eEquipmentSlot,
  type Dnd5eEquipmentState,
  CONTAINER_CAPACITY_LB,
  CONTAINER_KIND_LABELS_DE,
  EQUIPMENT_SLOT_LABELS_DE,
  MAX_ATTUNEMENT,
  MAX_BELT_SLOTS,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  carryingCapacityLb,
  computeArmorClassPreview,
  computeEquippedWeaponAttacks,
  computeEquipmentWeight,
  containerWeightLb,
  getUnassignedItems,
  hasBackpackContainer,
  itemWeightLb,
  normalizeEquipmentState,
  placeItemInContainer,
  placeItemInSlot,
  placeItemOnBelt,
  removeItemFromEquipment,
  toggleAttunement,
} from "@/src/lib/characters/dnd5e/equipment";
import {
  inferContainerKind,
  isBackpackItem,
  resolveCharacterItemStats,
} from "@/src/lib/characters/dnd5e/item-resolve";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import { EquipmentSilhouette } from "@/src/components/characters/EquipmentSilhouette";
import { CustomDnd5eItemEditorModal } from "@/src/components/characters/CustomDnd5eItemEditorModal";
import { parseFoundryItemTag } from "@/src/lib/characters/dnd5e/item-meta";

type Props = {
  characterId: string;
  sheet: Dnd5eSheetData;
  derived: Dnd5eDerivedSheet;
  level: number;
  readOnly: boolean;
  onEquipmentChange: (equipment: Dnd5eEquipmentState) => void;
};

function ItemSelect({
  value,
  items,
  placeholder,
  disabled,
  onChange,
}: {
  value: string;
  items: CharacterItem[];
  placeholder: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white disabled:opacity-60"
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name} ({itemWeightLb(item)} lb)
        </option>
      ))}
    </select>
  );
}

export function Dnd5eEquipmentTab({
  characterId,
  sheet,
  derived,
  level,
  readOnly,
  onEquipmentChange,
}: Props) {
  const [inventory, setInventory] = useState<CharacterInventoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<Dnd5eEquipmentSlot | null>(null);
  const [itemEditor, setItemEditor] = useState<CharacterItem | null | "new">(null);

  const equipment = useMemo(
    () => normalizeEquipmentState(sheet.equipment),
    [sheet.equipment],
  );

  const reloadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCharacterInventory(characterId);
      setInventory(data);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    void reloadInventory();
  }, [reloadInventory]);

  const items = useMemo(
    () => (inventory?.items ?? []).filter((i) => !i.is_deleted),
    [inventory?.items],
  );

  const itemNames = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, i.name])),
    [items],
  );

  const strScore = sheet.abilities.str?.score ?? 10;
  const capacity = carryingCapacityLb(strScore);
  const totalWeight = computeEquipmentWeight(items, equipment);
  const hasBackpack = hasBackpackContainer(equipment);
  const unassigned = getUnassignedItems(items, equipment);

  const backpackCandidates = items.filter(
    (i) => isBackpackItem(i) || inferContainerKind(i) != null,
  );

  const weaponAttacks = computeEquippedWeaponAttacks(sheet, derived, items, equipment, level);
  const acPreview = computeArmorClassPreview(sheet, derived, items, equipment);

  function update(next: Dnd5eEquipmentState) {
    onEquipmentChange(normalizeEquipmentState(next));
  }

  function addBackpackFromItem(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const kind = inferContainerKind(item) ?? "backpack";
    const container: Dnd5eEquipmentContainer = {
      id: crypto.randomUUID(),
      kind,
      label: item.name,
      linkedItemId: itemId,
      itemIds: [],
    };
    let next = normalizeEquipmentState(equipment);
    next = removeItemFromEquipment(next, itemId);
    next.containers = [...next.containers, container];
    update(next);
  }

  function addDefaultBackpack() {
    const container: Dnd5eEquipmentContainer = {
      id: crypto.randomUUID(),
      kind: "backpack",
      label: "Rucksack",
      linkedItemId: null,
      itemIds: [],
    };
    update({ ...equipment, containers: [...equipment.containers, container] });
  }

  function removeContainer(containerId: string) {
    update({
      ...equipment,
      containers: equipment.containers.filter((c) => c.id !== containerId),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-libre text-sm">Inventar wird geladen…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gewicht */}
      <section className="rounded-lg border border-hero-dark bg-background-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Traglast
          </h3>
          <div className="text-right">
            <p className="font-barlow text-2xl font-bold text-white">
              {totalWeight} <span className="text-sm text-gray-500">/ {capacity} lb</span>
            </p>
            <p className="font-libre text-xs text-gray-500">
              STR {strScore} × 15 = {capacity} lb Kapazität
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-hero-dark overflow-hidden">
          <div
            className={`h-full transition-all ${
              totalWeight > capacity ? "bg-red-500" : "bg-hero-vibrant"
            }`}
            style={{ width: `${Math.min(100, (totalWeight / Math.max(1, capacity)) * 100)}%` }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">Inventar</h3>
          {!readOnly ? (
            <button
              type="button"
              onClick={() => setItemEditor("new")}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-xs font-bold uppercase text-black hover:bg-yellow-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Eigenes Item (D&D 5e)
            </button>
          ) : null}
        </div>
        <p className="font-libre text-xs text-gray-500">
          Shop-Käufe, Foundry-Import und selbst erstellte Gegenstände. Foundry-Items werden beim
          Blatt-Sync aktualisiert; eigene Items bearbeitest du hier.
        </p>
        {items.length === 0 ? (
          <p className="font-libre text-sm text-gray-500 italic">Noch keine Gegenstände im Inventar.</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item) => {
              const stats = resolveCharacterItemStats(item);
              const isFoundry = Boolean(parseFoundryItemTag(item.description));
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-hero-border/30 bg-hero-dark/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-libre text-sm text-white truncate">{item.name}</p>
                    <p className="font-libre text-[10px] text-gray-500">
                      {item.category} · {stats.weightLb} lb
                      {isFoundry ? " · Foundry" : " · Eigen/Shop"}
                    </p>
                  </div>
                  {!readOnly && !isFoundry ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setItemEditor(item)}
                        className="rounded p-1.5 text-gray-500 hover:text-hero-vibrant"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`„${item.name}" wirklich löschen?`)) return;
                          await deleteCharacterItem(item.id);
                          update(removeItemFromEquipment(equipment, item.id));
                          await reloadInventory();
                        }}
                        className="rounded p-1.5 text-gray-500 hover:text-red-400"
                        title="Löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Schritt 1: Rucksack */}
      <section className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-4 space-y-3">
        <h3 className="font-barlow text-sm font-bold uppercase text-amber-200 flex items-center gap-2">
          <Backpack className="h-4 w-4" />
          1. Gepäck — Rucksack festlegen
        </h3>
        <p className="font-libre text-sm text-gray-400">
          Bevor du Ausrüstung verteilst, lege mindestens einen Rucksack oder eine Tasche der
          haltenden Magie fest. Gegenstände aus Shops und Loot landen in deinem Inventar.
        </p>

        {equipment.containers.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {backpackCandidates.length > 0 ? (
              <div className="space-y-2">
                <p className="font-barlow text-xs uppercase text-gray-500">Aus Inventar wählen</p>
                <ItemSelect
                  value=""
                  items={backpackCandidates}
                  placeholder="Rucksack wählen…"
                  disabled={readOnly}
                  onChange={(id) => addBackpackFromItem(id)}
                />
              </div>
            ) : null}
            {!readOnly ? (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addDefaultBackpack}
                  className="rounded border border-hero-border px-4 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant hover:bg-hero-dark/50"
                >
                  Standard-Rucksack hinzufügen
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {equipment.containers.map((container) => {
              const cap = CONTAINER_CAPACITY_LB[container.kind];
              const w = containerWeightLb(container, items);
              return (
                <div
                  key={container.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-hero-border/50 bg-hero-dark/30 px-3 py-2"
                >
                  <div>
                    <p className="font-barlow text-sm font-bold text-white">{container.label}</p>
                    <p className="font-libre text-xs text-gray-500">
                      {CONTAINER_KIND_LABELS_DE[container.kind]}
                      {cap != null ? ` · max. ${cap} lb` : ""} · {w} lb
                    </p>
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => removeContainer(container.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Entfernen
                    </button>
                  ) : null}
                </div>
              );
            })}
            {!readOnly && !hasBackpack ? (
              <p className="font-libre text-xs text-amber-400">
                Hinweis: Mindestens ein Rucksack-Typ wird empfohlen.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {hasBackpack ? (
        <>
          {/* Gürtel */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
            <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
              2. Gürtel — Schnellzugriff (max. {MAX_BELT_SLOTS})
            </h3>
            <p className="font-libre text-xs text-gray-500">
              Tränke, Dolche, Zauberstäbe oder andere schnell erreichbare Gegenstände.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {equipment.belt.map((itemId, index) => (
                <div key={index} className="space-y-1">
                  <span className="font-barlow text-[10px] uppercase text-gray-600">
                    Gürtel {index + 1}
                  </span>
                  {readOnly ? (
                    <p className="font-libre text-sm text-gray-300">
                      {itemId ? itemNames[itemId] ?? "—" : "—"}
                    </p>
                  ) : (
                    <ItemSelect
                      value={itemId ?? ""}
                      items={[...unassigned, ...(itemId ? items.filter((i) => i.id === itemId) : [])]}
                      placeholder="Leer"
                      onChange={(id) =>
                        update(placeItemOnBelt(equipment, index, id || null))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Silhouette + Kampfwerte */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-hero-dark bg-background-card p-4">
              <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold border-b border-hero-dark pb-2 mb-4">
                3. Ausrüstung am Körper
              </h3>
              <EquipmentSilhouette
                slots={equipment.slots}
                itemNames={itemNames}
                activeSlot={activeSlot}
                readOnly={readOnly}
                onSelectSlot={setActiveSlot}
              />
              {activeSlot && !readOnly ? (
                <div className="mt-4 space-y-2 border-t border-hero-dark pt-4">
                  <p className="font-barlow text-xs uppercase text-gray-500">
                    {EQUIPMENT_SLOT_LABELS_DE[activeSlot]} belegen
                  </p>
                  <ItemSelect
                    value={equipment.slots[activeSlot] ?? ""}
                    items={[
                      ...unassigned,
                      ...(equipment.slots[activeSlot]
                        ? items.filter((i) => i.id === equipment.slots[activeSlot])
                        : []),
                    ]}
                    placeholder="Nichts ausgerüstet"
                    onChange={(id) =>
                      update(placeItemInSlot(equipment, activeSlot, id || null))
                    }
                  />
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
              <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
                <Swords className="h-4 w-4" />
                Kampfwerte (ausgerüstet)
              </h3>

              <div className="rounded border border-hero-border/40 bg-hero-dark/20 p-3">
                <p className="font-barlow text-xs uppercase text-gray-500 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Rüstungsklasse (Vorschau)
                </p>
                <p className="font-barlow text-3xl font-bold text-white mt-1">{acPreview.ac}</p>
                <p className="font-libre text-xs text-gray-500 mt-1">{acPreview.breakdown}</p>
                <p className="font-libre text-[10px] text-gray-600 mt-1">
                  Gespeicherter Blattwert: {derived.ac}
                </p>
              </div>

              {weaponAttacks.length === 0 ? (
                <p className="font-libre text-sm text-gray-500">
                  Keine Waffe in Haupthand/Nebenhand ausgerüstet.
                </p>
              ) : (
                <div className="space-y-2">
                  {weaponAttacks.map((atk) => (
                    <div
                      key={atk.itemId}
                      className="rounded border border-hero-border/40 bg-hero-dark/20 p-3"
                    >
                      <p className="font-barlow font-bold text-white">{atk.name}</p>
                      <p className="font-libre text-sm text-accent-gold mt-1">
                        Angriff {formatSigned(atk.attackBonus)} · Schaden {atk.damage}
                      </p>
                      {atk.notes ? (
                        <p className="font-libre text-xs text-gray-500 mt-1">{atk.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Gepäck-Verteilung */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-4">
            <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
              <Package className="h-4 w-4" />
              4. Gepäck verteilen
            </h3>
            {equipment.containers.map((container) => (
              <div key={container.id} className="rounded border border-hero-border/40 p-3 space-y-2">
                <p className="font-barlow text-sm font-bold text-white">{container.label}</p>
                {container.itemIds.length === 0 ? (
                  <p className="font-libre text-xs text-gray-500 italic">Noch leer</p>
                ) : (
                  <ul className="space-y-1">
                    {container.itemIds.map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-2 font-libre text-sm text-gray-300"
                      >
                        <span>
                          {itemNames[id] ?? id.slice(0, 8)} ({itemWeightLb(items.find((i) => i.id === id)!) } lb)
                        </span>
                        {!readOnly ? (
                          <button
                            type="button"
                            onClick={() => {
                              const next = normalizeEquipmentState(equipment);
                              next.containers = next.containers.map((c) =>
                                c.id === container.id
                                  ? { ...c, itemIds: c.itemIds.filter((x) => x !== id) }
                                  : c,
                              );
                              update(next);
                            }}
                            className="text-xs text-red-400"
                          >
                            Entfernen
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {!readOnly ? (
                  <ItemSelect
                    value=""
                    items={unassigned}
                    placeholder="Gegenstand einpacken…"
                    onChange={(id) => update(placeItemInContainer(equipment, container.id, id))}
                  />
                ) : null}
              </div>
            ))}

            {unassigned.length > 0 ? (
              <div className="border-t border-hero-dark pt-3">
                <p className="font-barlow text-xs uppercase text-gray-500 mb-2">
                  Noch nicht verteilt ({unassigned.length})
                </p>
                <ul className="flex flex-wrap gap-2">
                  {unassigned.map((item) => (
                    <li
                      key={item.id}
                      className="rounded border border-hero-border/30 bg-hero-dark/20 px-2 py-1 font-libre text-xs text-gray-400"
                    >
                      {item.name} ({itemWeightLb(item)} lb)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Einstimmung */}
          <section className="rounded-lg border border-hero-dark bg-background-card p-4 space-y-3">
            <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Magische Einstimmung (max. {MAX_ATTUNEMENT})
            </h3>
            <p className="font-libre text-xs text-gray-500">
              Eingestimmte Gegenstände: {equipment.attunedItemIds.length} / {MAX_ATTUNEMENT}
            </p>
            <div className="space-y-2">
              {items
                .filter((i) => {
                  const s = resolveCharacterItemStats(i);
                  return s.attunement || s.isMagical;
                })
                .map((item) => {
                  const attuned = equipment.attunedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 rounded border border-hero-border/30 bg-hero-dark/20 px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={attuned}
                        disabled={
                          readOnly ||
                          (!attuned && equipment.attunedItemIds.length >= MAX_ATTUNEMENT)
                        }
                        onChange={() => update(toggleAttunement(equipment, item.id))}
                        className="rounded border-hero-border"
                      />
                      <span className="font-libre text-sm text-gray-300">{item.name}</span>
                      {resolveCharacterItemStats(item).attunement ? (
                        <span className="ml-auto font-barlow text-[10px] uppercase text-accent-gold">
                          Einstimmung
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              {items.filter((i) => resolveCharacterItemStats(i).isMagical).length === 0 ? (
                <p className="font-libre text-sm text-gray-500 italic">
                  Keine magischen Gegenstände im Inventar.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <p className="font-libre text-sm text-gray-500 text-center py-6">
          Lege zuerst einen Rucksack fest, um Gürtel, Ausrüstung und Gepäck zu verwalten.
        </p>
      )}
      {itemEditor !== null ? (
        <CustomDnd5eItemEditorModal
          characterId={characterId}
          item={itemEditor === "new" ? null : itemEditor}
          onClose={() => setItemEditor(null)}
          onSaved={async () => {
            setItemEditor(null);
            await reloadInventory();
          }}
        />
      ) : null}
    </div>
  );
}
