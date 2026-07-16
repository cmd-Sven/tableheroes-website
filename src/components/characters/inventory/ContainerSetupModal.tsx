"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  Dnd5eContainerKind,
  Dnd5eEquipmentContainer,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  CONTAINER_CAPACITY_LB,
  CONTAINER_KIND_LABELS_DE,
} from "@/src/lib/characters/dnd5e/equipment-types";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  mode: "create" | "edit";
  initial?: Dnd5eEquipmentContainer | null;
  linkedItemName?: string | null;
  onConfirm: (container: Omit<Dnd5eEquipmentContainer, "itemIds"> & { itemIds?: string[] }) => void;
  onClose: () => void;
};

const KINDS: Dnd5eContainerKind[] = ["backpack", "bag_of_holding", "pouch"];

export function ContainerSetupModal({
  mode,
  initial,
  linkedItemName,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [kind, setKind] = useState<Dnd5eContainerKind>(initial?.kind ?? "backpack");
  const [label, setLabel] = useState(
    initial?.label ?? linkedItemName ?? t("equipment.defaultBackpack"),
  );
  const [maxCapacity, setMaxCapacity] = useState(
    String(initial?.maxCapacityLb ?? CONTAINER_CAPACITY_LB[initial?.kind ?? "backpack"]),
  );

  function handleKindChange(next: Dnd5eContainerKind) {
    setKind(next);
    if (!initial?.maxCapacityLb) {
      setMaxCapacity(String(CONTAINER_CAPACITY_LB[next]));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cap = Math.max(1, Math.round(Number(maxCapacity) || CONTAINER_CAPACITY_LB[kind]));
    onConfirm({
      id: initial?.id ?? crypto.randomUUID(),
      kind,
      label: label.trim() || CONTAINER_KIND_LABELS_DE[kind],
      linkedItemId: initial?.linkedItemId ?? null,
      maxCapacityLb: cap,
      itemIds: initial?.itemIds ?? [],
    });
  }

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">
            {mode === "create" ? t("inventory.containerCreateTitle") : t("inventory.containerEditTitle")}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
              {t("inventory.containerTypeLabel")}
            </span>
            <select
              value={kind}
              onChange={(e) => handleKindChange(e.target.value as Dnd5eContainerKind)}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {CONTAINER_KIND_LABELS_DE[k]} ({CONTAINER_CAPACITY_LB[k]} lb)
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
              {t("inventory.containerNameLabel")}
            </span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-gray-500">
              {t("inventory.containerMaxWeightLabel")}
            </span>
            <input
              type="number"
              min={1}
              step={1}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
            />
            <p className="mt-1 font-libre text-[10px] text-gray-500">
              {t("inventory.containerMaxWeightHint", { default: CONTAINER_CAPACITY_LB[kind] })}
            </p>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
          >
            {t("inventory.cancel")}
          </button>
          <button
            type="submit"
            className="rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-xs font-bold uppercase text-black"
          >
            {mode === "create" ? t("inventory.containerAdd") : t("inventory.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
