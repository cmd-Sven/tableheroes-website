"use client";

import { Star } from "lucide-react";
import {
  calculateLevel,
  getPointsForNextLevel,
} from "@/src/lib/utils/rank-utils";

type Props = {
  totalPoints: number;
};

export function PointsCard({ totalPoints }: Props) {
  const level = calculateLevel(totalPoints);
  const nextLevelPoints = getPointsForNextLevel(level);
  const currentLevelBase = level > 0 ? getPointsForNextLevel(level - 1) : 0;
  const gainedInLevel = Math.max(0, totalPoints - currentLevelBase);
  const requiredForLevel =
    nextLevelPoints - currentLevelBase > 0
      ? nextLevelPoints - currentLevelBase
      : 1;
  const progress = Math.max(
    0,
    Math.min(100, (gainedInLevel / requiredForLevel) * 100),
  );

  return (
    <div className="w-full p-4">
      <div className="flex items-center gap-3 rounded-lg border border-hero-border/40 bg-hero-dark/30 px-4 py-4 w-full">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-gold/20 border border-accent-gold/50">
          <Star className="h-6 w-6 text-accent-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-barlow font-bold uppercase text-gray-500">
            Gesamtpunkte
          </p>
          <p className="font-cinzel font-bold text-2xl text-hero-vibrant">
            {totalPoints}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-barlow uppercase text-gray-500">
          <span>Level {level}</span>
          <span>
            {gainedInLevel}/{requiredForLevel} XP bis Level {level + 1}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-hero-border/40 bg-hero-dark/60">
          <div
            className="h-full bg-hero-vibrant"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
