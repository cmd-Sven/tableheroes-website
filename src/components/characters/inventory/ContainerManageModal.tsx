"use client";

import { useState } from "react";
import { ArrowLeftRight, Pencil, Trash2, X } from "lucide-react";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
import type { PartyCharacterOption } from "@/src/lib/actions/character-inventory-actions";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  container: Dnd5eEquipmentContainer;
  itemCount: number;
  partyCharacters: PartyCharacterOption[];
  onEdit: () => void;
  onDelete: () => void;
  onTransfer: (targetCharacterId: string) => void;
  onClose: () => void;
};

export function ContainerManageModal({
  container,
  itemCount,
  partyCharacters,
  onEdit,
  onDelete,
  onTransfer,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [targetId, setTargetId] = useState(partyCharacters[0]?.id ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold truncate pr-2">
            {container.label}
          </h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 font-libre text-xs text-gray-400">
          {t("inventory.containerManageHint", { count: itemCount })}
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="flex w-full items-center gap-2 rounded border border-hero-border/50 px-3 py-2 font-libre text-sm text-gray-200 hover:bg-hero-dark/50"
          >
            <Pencil className="h-4 w-4 text-hero-vibrant" />
            {t("equipment.edit")}
          </button>

          {partyCharacters.length > 0 ? (
            <div className="rounded border border-hero-border/40 p-3 space-y-2">
              <p className="font-barlow text-[10px] font-bold uppercase text-gray-500">
                {t("inventory.containerTransferTitle")}
              </p>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded border border-hero-border bg-hero-dark/60 px-2 py-1.5 font-libre text-xs text-white"
              >
                {partyCharacters.map((pc) => (
                  <option key={pc.id} value={pc.id}>
                    {pc.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!targetId}
                onClick={() => targetId && onTransfer(targetId)}
                className="flex w-full items-center justify-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-2 font-barlow text-xs font-bold uppercase text-accent-gold disabled:opacity-40"
              >
                <ArrowLeftRight className="h-4 w-4" />
                {t("inventory.containerTransfer")}
              </button>
            </div>
          ) : null}

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center gap-2 rounded border border-red-500/40 px-3 py-2 font-libre text-sm text-red-400 hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
              {container.linkedItemId
                ? t("inventory.unequipLuggage")
                : t("equipment.delete")}
            </button>
          ) : (
            <div className="rounded border border-red-500/50 bg-red-950/20 p-3 space-y-2">
              <p className="font-libre text-xs text-red-300">
                {container.linkedItemId
                  ? itemCount > 0
                    ? t("inventory.unequipLuggageRedistribute", { count: itemCount })
                    : t("inventory.unequipLuggageEmpty")
                  : itemCount > 0
                    ? t("inventory.containerDeleteRedistribute", { count: itemCount })
                    : t("inventory.containerDeleteEmpty")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded border border-hero-border px-2 py-1 font-barlow text-[10px] uppercase text-gray-400"
                >
                  {t("inventory.cancel")}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex-1 rounded bg-red-600 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-white"
                >
                  {container.linkedItemId
                    ? t("inventory.unequipLuggage")
                    : t("equipment.delete")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
