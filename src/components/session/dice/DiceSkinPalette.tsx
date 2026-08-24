"use client";

import { motion } from "framer-motion";
import { diceSkinsForPalette, type DiceSkinId } from "@/src/lib/session/dice-skins";

type Props = {
  value: DiceSkinId;
  onChange: (id: DiceSkinId) => void;
  /** SL sieht Marmor-Preset hervorgehoben. */
  isGM?: boolean;
};

export function DiceSkinPalette({ value, onChange, isGM = false }: Props) {
  const skins = diceSkinsForPalette(isGM);
  return (
    <div className="space-y-1">
      <p className="font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-500">
        Würfel-Skin
      </p>
      <div className="flex flex-wrap gap-1" role="listbox" aria-label="Würfel-Skin wählen">
        {skins.map((skin) => {
          const selected = value === skin.id;
          const emphasizeGm = isGM && skin.gmPreset;
          return (
            <motion.button
              key={skin.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={skin.labelDe}
              aria-label={skin.labelDe}
              onClick={() => onChange(skin.id)}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.12 }}
              className={`relative h-5 w-5 shrink-0 rounded-sm border shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-accent-gold ${
                selected
                  ? "border-accent-gold ring-1 ring-accent-gold/80"
                  : emphasizeGm
                    ? "border-hero-border/80"
                    : "border-white/20 hover:border-hero-vibrant/60"
              }`}
              style={{ background: skin.swatch }}
            >
              {skin.pattern === "marble" || skin.pattern === "void-swirl" || skin.pattern === "chrome" ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center font-barlow text-[8px] font-extrabold leading-none"
                  style={{ color: skin.numeralColor }}
                  aria-hidden
                >
                  20
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
