"use client";

import { useState, useEffect, useRef } from "react";
import { Award } from "lucide-react";
import type { Achievement } from "@/src/types/achievement";
import {
  getAchievementImageSrc,
  getAchievementImageFallbackSrc,
} from "@/src/types/achievement";

const NEW_BADGE_STYLE =
  "absolute top-2 right-2 z-10 rounded-full bg-accent-gold/90 px-2 py-0.5 font-barlow font-bold text-[10px] uppercase text-background-dark shadow-md";
const NEW_GLOW_STYLE = "shadow-[0_0_15px_rgba(212,175,55,0.5)] animate-pulse";

type Props = {
  achievements: Achievement[];
  hasNewContent?: boolean;
  onMarkAsRead?: () => void | Promise<void>;
};

export function AchievementsCard({
  achievements,
  hasNewContent = false,
  onMarkAsRead,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNewContent || !onMarkAsRead) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onMarkAsRead();
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNewContent, onMarkAsRead]);

  const content =
    achievements.length === 0 ? (
      <p className="font-libre text-sm text-gray-500 italic">
        Noch keine Achievements freigeschaltet.
      </p>
    ) : (
      <ul className="flex flex-wrap gap-4 w-full">
        {achievements.map((a) => (
          <AchievementItem key={a.id} achievement={a} />
        ))}
      </ul>
    );

  return (
    <div className="w-full p-4" ref={ref}>
      {hasNewContent ? (
        <div
          className={`relative rounded-lg border border-hero-border/40 bg-hero-dark/20 min-h-[80px] ${NEW_GLOW_STYLE}`}
        >
          <span className={NEW_BADGE_STYLE} aria-hidden>
            NEU
          </span>
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}

const ACHIEVEMENT_ICON_SIZE = 120;

function AchievementItem({ achievement: a }: { achievement: Achievement }) {
  const [src, setSrc] = useState<string | null>(() =>
    getAchievementImageSrc(a.image_url)
  );
  const fallback = getAchievementImageFallbackSrc(a.image_url);

  const handleError = () => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
    } else {
      setSrc(null);
    }
  };

  return (
    <li
      className="inline-flex items-center gap-3 rounded-lg border border-hero-border/40 bg-hero-dark/20 px-4 py-3 font-libre text-sm text-gray-200"
      title={a.name}
    >
      <span
        className="h-[120px] w-[120px] shrink-0 flex items-center justify-center overflow-hidden rounded-lg border border-accent-gold/30 bg-accent-gold/10"
        style={{
          minWidth: ACHIEVEMENT_ICON_SIZE,
          minHeight: ACHIEVEMENT_ICON_SIZE,
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            width={ACHIEVEMENT_ICON_SIZE}
            height={ACHIEVEMENT_ICON_SIZE}
            className="h-[120px] w-[120px] object-contain"
            onError={handleError}
          />
        ) : (
          <Award className="h-10 w-10 text-accent-gold/70" />
        )}
      </span>
      <span className="truncate max-w-[180px] font-libre text-gray-200">
        {a.name}
      </span>
    </li>
  );
}
