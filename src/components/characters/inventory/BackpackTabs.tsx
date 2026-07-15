"use client";

import { Backpack, Briefcase, Package, Plus, AlertTriangle } from "lucide-react";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
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
  onAddDefault?: () => void;
  weightByContainer?: ContainerWeightInfo[];
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
  onAddDefault,
  weightByContainer = [],
}: Props) {
  const { t } = useCharacterSheetLocale();
  const weightMap = new Map(weightByContainer.map((w) => [w.id, w]));

  if (containers.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-libre text-xs text-gray-500">{t("inventory.noBackpack")}</p>
        {!readOnly && onAddDefault ? (
          <button
            type="button"
            onClick={onAddDefault}
            className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-dark/50"
          >
            <Plus className="h-3 w-3" />
            {t("equipment.addDefaultBackpack")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {containers.map((container) => {
        const Icon = containerIcon(container.kind);
        const active = container.id === activeId;
        const w = weightMap.get(container.id);
        const overweight = w ? w.weightLb > w.maxLb : false;

        return (
          <div key={container.id} className="relative">
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
              className={`flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-md border-2 transition-colors ${
                overweight
                  ? "border-red-500/80 bg-red-950/30 text-red-300"
                  : active
                    ? "border-hero-vibrant bg-hero-vibrant/15 text-hero-vibrant shadow-[0_0_10px_rgba(55,152,6,0.2)]"
                    : "border-hero-border/50 bg-hero-dark/40 text-gray-400 hover:border-hero-border hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-[40px] truncate font-barlow text-[7px] font-bold uppercase leading-tight">
                {container.label}
              </span>
            </button>
            {overweight ? (
              <span
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-black"
                title={
                  w
                    ? t("inventory.containerOverweight", {
                        weight: w.weightLb,
                        max: w.maxLb,
                        name: container.label,
                      })
                    : undefined
                }
              >
                <AlertTriangle className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </div>
        );
      })}
      {!readOnly && onAddDefault ? (
        <button
          type="button"
          onClick={onAddDefault}
          title={t("equipment.addDefaultBackpack")}
          className="flex h-11 w-11 flex-col items-center justify-center rounded-md border-2 border-dashed border-hero-border/40 text-gray-500 hover:border-hero-vibrant hover:text-hero-vibrant"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
