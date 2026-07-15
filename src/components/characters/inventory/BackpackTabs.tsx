"use client";

import { Backpack, Briefcase, Package, Plus } from "lucide-react";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  containers: Dnd5eEquipmentContainer[];
  activeId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onAddDefault?: () => void;
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
}: Props) {
  const { t } = useCharacterSheetLocale();

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
    <div className="flex flex-wrap gap-2">
      {containers.map((container) => {
        const Icon = containerIcon(container.kind);
        const active = container.id === activeId;
        return (
          <button
            key={container.id}
            type="button"
            onClick={() => onSelect(container.id)}
            title={container.label}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 transition-colors ${
              active
                ? "border-hero-vibrant bg-hero-vibrant/15 text-hero-vibrant shadow-[0_0_12px_rgba(55,152,6,0.25)]"
                : "border-hero-border/50 bg-hero-dark/40 text-gray-400 hover:border-hero-border hover:text-gray-200"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="max-w-[52px] truncate font-barlow text-[8px] font-bold uppercase leading-tight">
              {container.label}
            </span>
          </button>
        );
      })}
      {!readOnly && onAddDefault ? (
        <button
          type="button"
          onClick={onAddDefault}
          title={t("equipment.addDefaultBackpack")}
          className="flex h-14 w-14 flex-col items-center justify-center rounded-md border-2 border-dashed border-hero-border/40 text-gray-500 hover:border-hero-vibrant hover:text-hero-vibrant"
        >
          <Plus className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
