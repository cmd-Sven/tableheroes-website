"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CharacterItem } from "@/src/types/inventory";
import type { Dnd5eEquipmentContainer } from "@/src/lib/characters/dnd5e/equipment-types";
import type { PartyCharacterOption } from "@/src/lib/actions/character-inventory-actions";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

export function ItemDeleteConfirmModal({
  item,
  onConfirm,
  onClose,
}: {
  item: CharacterItem;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();
  return (
    <ModalShell title={t("equipment.delete")} onClose={onClose}>
      <p className="font-libre text-sm text-gray-300">
        {t("equipment.deleteConfirm", { name: item.name })}
      </p>
      <ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={t("equipment.delete")} danger />
    </ModalShell>
  );
}

export function ItemMoveModal({
  item,
  containers,
  activeContainerId,
  onConfirm,
  onClose,
}: {
  item: CharacterItem;
  containers: Dnd5eEquipmentContainer[];
  activeContainerId: string;
  onConfirm: (containerId: string) => void;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();
  const targets =
    activeContainerId === "__unassigned__"
      ? containers
      : containers.filter((c) => c.id !== activeContainerId);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  return (
    <ModalShell title={t("inventory.moveTitle")} onClose={onClose}>
      <p className="mb-3 font-libre text-xs text-gray-400">{item.name}</p>
      {targets.length === 0 ? (
        <p className="font-libre text-sm text-gray-500">{t("inventory.moveNoTarget")}</p>
      ) : (
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
        >
          {targets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      <ModalActions
        onCancel={onClose}
        onConfirm={() => targetId && onConfirm(targetId)}
        confirmLabel={t("inventory.move")}
        disabled={!targetId}
      />
    </ModalShell>
  );
}

export function ItemGiveModal({
  item,
  partyCharacters,
  onConfirm,
  onClose,
}: {
  item: CharacterItem;
  partyCharacters: PartyCharacterOption[];
  onConfirm: (targetCharacterId: string) => void;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();
  const [targetId, setTargetId] = useState(partyCharacters[0]?.id ?? "");

  return (
    <ModalShell title={t("inventory.giveTitle")} onClose={onClose}>
      <p className="mb-3 font-libre text-xs text-gray-400">{item.name}</p>
      {partyCharacters.length === 0 ? (
        <p className="font-libre text-sm text-gray-500">{t("inventory.giveNoTarget")}</p>
      ) : (
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="w-full rounded border border-hero-border bg-hero-dark/60 px-3 py-2 font-libre text-sm text-white"
        >
          {partyCharacters.map((pc) => (
            <option key={pc.id} value={pc.id}>
              {pc.name}
            </option>
          ))}
        </select>
      )}
      <ModalActions
        onCancel={onClose}
        onConfirm={() => targetId && onConfirm(targetId)}
        confirmLabel={t("inventory.give")}
        disabled={!targetId}
      />
    </ModalShell>
  );
}

export function ItemDuplicateConfirmModal({
  item,
  onConfirm,
  onClose,
}: {
  item: CharacterItem;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useCharacterSheetLocale();
  return (
    <ModalShell title={t("inventory.duplicate")} onClose={onClose}>
      <p className="font-libre text-sm text-gray-300">
        {t("inventory.duplicateConfirm", { name: item.name })}
      </p>
      <ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={t("inventory.duplicate")} />
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { t } = useCharacterSheetLocale();
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
      >
        {t("inventory.cancel")}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className={`rounded px-3 py-1.5 font-barlow text-xs font-bold uppercase disabled:opacity-40 ${
          danger ? "bg-red-600 text-white" : "bg-hero-vibrant text-black"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
