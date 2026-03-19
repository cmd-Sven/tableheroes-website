"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Award } from "lucide-react";
import type { Achievement } from "@/src/types/achievement";
import {
  getAchievementImageSrc,
  getAchievementImageFallbackSrc,
} from "@/src/types/achievement";

const NEW_BADGE_STYLE =
  "absolute top-2 right-2 z-10 rounded-full bg-accent-gold/90 px-2 py-0.5 font-barlow font-bold text-[10px] uppercase text-background-dark shadow-md";
const NEW_GLOW_STYLE = "shadow-[0_0_15px_rgba(212,175,55,0.5)] animate-pulse";
const ICON_SIZE = 56; // 56x56px (zwischen 48 und 64)
const MAX_DISPLAY = 3;

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

  const displayList = achievements.slice(0, MAX_DISPLAY);

  const content =
    achievements.length === 0 ? (
      <div className="text-center py-6">
        <Award className="h-12 w-12 text-gray-600 mx-auto mb-2" />
        <p className="font-libre text-sm text-gray-500 italic">
          Noch keine Heldentaten vollbracht.
        </p>
        <p className="font-libre text-xs text-gray-600 mt-1">
          Achievements werden vom GM vergeben.
        </p>
      </div>
    ) : (
      <ul className="flex flex-wrap justify-center gap-3 w-full">
        {displayList.map((a) => (
          <AchievementIconItem key={a.id} achievement={a} size={ICON_SIZE} />
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

const TOOLTIP_GAP = 8;

function AchievementIconItem({
  achievement: a,
  size,
}: {
  achievement: Achievement;
  size: number;
}) {
  const [src, setSrc] = useState<string | null>(() =>
    getAchievementImageSrc(a.image_url)
  );
  const fallback = getAchievementImageFallbackSrc(a.image_url);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [tooltipState, setTooltipState] = useState<{
    show: boolean;
    left: number;
    top: number;
  }>({ show: false, left: 0, top: 0 });

  const handleError = () => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
    } else {
      setSrc(null);
    }
  };

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipState({
      show: true,
      left: rect.left + rect.width / 2,
      top: rect.top - TOOLTIP_GAP,
    });
  }, []);

  const showTooltip = () => updatePosition();
  const hideTooltip = () => setTooltipState((s) => ({ ...s, show: false }));

  const points = a.points_awarded ?? 0;
  const description = a.description?.trim() ?? "";
  const tooltipLines = [
    a.name,
    points > 0 ? `+${points} Punkte` : "",
    description,
  ].filter(Boolean);
  const tooltipText = tooltipLines.join("\n");

  const tooltipContent = tooltipState.show && (
    <div
      className="fixed z-100 w-48 rounded-md border border-gray-700 bg-gray-900 p-3 shadow-lg text-left"
      style={{
        left: tooltipState.left,
        top: tooltipState.top,
        transform: "translate(-50%, -100%)",
      }}
      role="tooltip"
    >
      <p className="font-barlow font-bold text-sm text-white whitespace-nowrap truncate">
        {a.name}
      </p>
      {points > 0 && (
        <p className="font-libre text-xs text-gray-100 mt-0.5">
          +{points} Punkte
        </p>
      )}
      {description && (
        <p className="font-libre text-xs text-gray-100 mt-1 line-clamp-3">
          {description}
        </p>
      )}
    </div>
  );

  return (
    <li className="relative">
      <div
        ref={triggerRef}
        className="flex items-center justify-center overflow-hidden rounded-lg border border-accent-gold/30 bg-accent-gold/10 hover:border-accent-gold/60 transition-colors"
        style={{ width: size, height: size }}
        title={tooltipText.replace(/\n/g, " · ")}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {src ? (
          <img
            src={src}
            alt=""
            width={size}
            height={size}
            className="object-contain w-full h-full"
            onError={handleError}
          />
        ) : (
          <Award className="h-6 w-6 text-accent-gold/70" />
        )}
      </div>
      {typeof document !== "undefined" &&
        tooltipState.show &&
        createPortal(tooltipContent, document.body)}
    </li>
  );
}
