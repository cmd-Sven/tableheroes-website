"use client";

import { Backpack, Briefcase, MoreVertical, Package, Plus, AlertTriangle } from "lucide-react";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
import { MAX_LUGGAGE_SLOTS } from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type ContainerWeightInfo = {
  id: string;
  weightLb: number;
  maxLb: number;
};

type Props = {
  containers: Dnd5eEquipmentContainer[];
  activeId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  /** Klick auf leeren Slot → Gepäck aus Inventar ausrüsten */
  onEquipFromInventory?: () => void;
  onManage?: (containerId: string) => void;
  weightByContainer?: ContainerWeightInfo[];
  /** Drop eines Items auf einen bestehenden Behälter-Tab */
  onDropOnContainer?: (e: React.DragEvent, containerId: string) => void;
  /** Drop eines Rucksack-Items auf leeren Slot → als Gepäck ausrüsten */
  onDropEquipNew?: (e: React.DragEvent) => void;
};

function containerIcon(kind: Dnd5eEquipmentContainer["kind"]) {
  if (kind === "bag_of_holding") return Briefcase;
  if (kind === "pouch") return Package;
  return Backpack;
}

export function BackpackTabs({
  containers,
  activeId,
  readOnly,
  onSelect,
  onEquipFromInventory,
  onManage,
  weightByContainer = [],
  onDropOnContainer,
  onDropEquipNew,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const weightMap = new Map(weightByContainer.map((w) => [w.id, w]));
  const slots: Array<Dnd5eEquipmentContainer | null> = [
    ...containers,
    ...Array.from(
      { length: Math.max(0, MAX_LUGGAGE_SLOTS - containers.length) },
      () => null,
    ),
  ];
  const canEquipMore = !readOnly && containers.length < MAX_LUGGAGE_SLOTS;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500">
          {t("inventory.luggageSlots", { used: containers.length, max: MAX_LUGGAGE_SLOTS })}
        </span>
        {slots.map((container, index) => {
          if (container) {
            const Icon = containerIcon(container.kind);
            const active = container.id === activeId;
            const w = weightMap.get(container.id);
            const overweight = w ? w.weightLb > w.maxLb : false;

            return (
              <div
                key={container.id}
                className="relative flex items-center"
                onDragOver={
                  onDropOnContainer
                    ? (e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    : undefined
                }
                onDrop={
                  onDropOnContainer
                    ? (e) => onDropOnContainer(e, container.id)
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => onSelect(container.id)}
                  title={
                    overweight && w
                      ? t("inventory.containerOverweight", {
                          weight: w.weightLb,
                          max: w.maxLb,
                          name: container.label,
                        })
                      : container.label
                  }
                  className={`relative flex h-9 w-9 flex-col items-center justify-center gap-0 rounded-md border-2 transition-all ${
                    overweight
                      ? "border-red-500/80 bg-red-950/30 text-red-300"
                      : active
                        ? "border-hero-vibrant bg-hero-vibrant/25 text-hero-vibrant shadow-[0_0_14px_rgba(55,152,6,0.5)] ring-2 ring-hero-vibrant/50 ring-offset-1 ring-offset-background-card scale-105"
                        : "border-hero-border/50 bg-hero-dark/40 text-gray-400 hover:border-hero-border hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {active && !overweight ? (
                    <span className="absolute -bottom-0.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-accent-gold/90" />
                  ) : null}
                </button>
                {!readOnly && onManage ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManage(container.id);
                    }}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-hero-border/60 bg-background-card text-gray-400 hover:text-white"
                    title={t("inventory.containerManage")}
                  >
                    <MoreVertical className="h-2.5 w-2.5" />
                  </button>
                ) : null}
                {overweight ? (
                  <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-black">
                    <AlertTriangle className="h-2 w-2" />
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <button
              key={`empty-luggage-${index}`}
              type="button"
              disabled={!canEquipMore || !onEquipFromInventory}
              onClick={() => canEquipMore && onEquipFromInventory?.()}
              onDragOver={
                canEquipMore && onDropEquipNew
                  ? (e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }
                  : undefined
              }
              onDrop={canEquipMore ? onDropEquipNew : undefined}
              title={
                canEquipMore
                  ? t("inventory.equipLuggageSlotHint")
                  : t("inventory.luggageSlotsFull", { max: MAX_LUGGAGE_SLOTS })
              }
              className={`flex h-9 w-9 items-center justify-center rounded-md border-2 border-dashed transition-colors ${
                canEquipMore
                  ? "border-hero-border/40 text-gray-500 hover:border-hero-vibrant hover:text-hero-vibrant"
                  : "cursor-not-allowed border-hero-border/20 text-gray-700 opacity-50"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
      {containers.length === 0 ? (
        <p className="font-libre text-xs text-gray-500">{t("inventory.noBackpack")}</p>
      ) : null}
    </div>
  );
}
