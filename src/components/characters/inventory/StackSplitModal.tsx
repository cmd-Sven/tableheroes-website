"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  title: string;
  maxAmount: number;
  defaultAmount?: number;
  confirmLabel: string;
  onConfirm: (amount: number) => void;
  onClose: () => void;
};

export function StackSplitModal({
  title,
  maxAmount,
  defaultAmount = 1,
  confirmLabel,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useCharacterSheetLocale();
  const [amount, setAmount] = useState(Math.min(defaultAmount, maxAmount));

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-hero-border bg-background-card p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-barlow text-sm font-bold uppercase text-accent-gold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="font-libre text-sm text-gray-300">
            {t("inventory.amountLabel")}: <strong>{amount}</strong> / {maxAmount}
          </p>
          <input
            type="range"
            min={1}
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-hero-vibrant"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-gray-400"
            >
              {t("inventory.cancel")}
            </button>
            <button
              type="button"
              onClick={() => onConfirm(amount)}
              className="rounded bg-hero-vibrant px-3 py-1.5 font-barlow text-xs font-bold uppercase text-black"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
