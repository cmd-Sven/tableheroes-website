"use client";

import Image from "next/image";
import { Award } from "lucide-react";
import type { Dnd5eCharacterAchievement } from "@/src/lib/characters/dnd5e/types";
import { getAchievementImageSrc } from "@/src/types/achievement";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

type Props = {
  achievements: Dnd5eCharacterAchievement[];
};

export function CharacterAchievementsPanel({ achievements }: Props) {
  const { t } = useCharacterSheetLocale();

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-4">
      <h3 className="font-barlow text-[10px] font-bold uppercase text-accent-gold border-b border-hero-dark pb-2 mb-3 flex items-center gap-1.5">
        <Award className="h-3.5 w-3.5" />
        {t("achievements.title")}
      </h3>
      {achievements.length === 0 ? (
        <p className="font-libre text-sm text-gray-500">{t("achievements.empty")}</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {achievements.map((a) => {
            const src = getAchievementImageSrc(a.imageUrl ?? null);
            return (
              <li
                key={a.id}
                className="flex items-center gap-2.5 rounded border border-hero-border/40 bg-hero-dark/20 px-2 py-1.5"
                title={a.name}
              >
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-hero-dark text-accent-gold">
                    <Award className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-barlow text-xs font-bold text-white">{a.name}</p>
                  {a.awardedAt ? (
                    <p className="font-libre text-[9px] text-gray-500">
                      {new Date(a.awardedAt).toLocaleDateString("de-DE")}
                    </p>
                  ) : null}
                </div>
                {(a.pointsAwarded ?? 0) > 0 ? (
                  <span className="shrink-0 font-barlow text-[10px] font-bold text-accent-gold">
                    +{a.pointsAwarded}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 font-libre text-[9px] text-gray-600">{t("achievements.accountHint")}</p>
    </section>
  );
}
