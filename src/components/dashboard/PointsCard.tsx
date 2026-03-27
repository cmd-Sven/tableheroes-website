"use client";

import { useState, useEffect, useRef } from "react";
import { Star, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import {
  calculateLevel,
  getPointsForNextLevel,
} from "@/src/lib/utils/rank-utils";
import confetti from "canvas-confetti";
import { createClient } from "@/src/lib/supabase/client";
import type { PointLogEntry } from "@/src/lib/types/point-log";

type Props = {
  totalPoints: number;
  pointsHistory?: PointLogEntry[];
};

const STORAGE_KEY = "last_seen_points_entry_id";

export function PointsCard({ totalPoints: initialPoints, pointsHistory: initialHistory = [] }: Props) {
  const [totalPoints, setTotalPoints] = useState(initialPoints);
  const [pointsHistory, setPointsHistory] = useState(initialHistory);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [progressAnimated, setProgressAnimated] = useState(0);
  const hasCheckedForNew = useRef(false);

  // Level Calculation
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
    Math.min(100, (gainedInLevel / requiredForLevel) * 100)
  );

  // Animate progress bar on load
  useEffect(() => {
    const timer = setTimeout(() => setProgressAnimated(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // ============================================================================
  // Gold Rain Animation
  // ============================================================================
  function triggerGoldRain() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 999999,
      colors: ["#FFD700", "#FFA500", "#FF8C00", "#cab926", "#d4af37"],
    };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    playGoldSound();
  }

  function playGoldSound() {
    try {
      const audio = new Audio("/sounds/coin.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  }

  useEffect(() => {
    if (hasCheckedForNew.current) return;
    hasCheckedForNew.current = true;

    if (typeof window === "undefined") return;
    if (pointsHistory.length === 0) return;

    const lastSeenId = localStorage.getItem(STORAGE_KEY);
    const newestEntry = pointsHistory[0];

    if (newestEntry && newestEntry.id !== lastSeenId) {
      localStorage.setItem(STORAGE_KEY, newestEntry.id);
      if (newestEntry.amount > 0) {
        setTimeout(() => triggerGoldRain(), 500);
      }
    } else if (!lastSeenId && newestEntry) {
      localStorage.setItem(STORAGE_KEY, newestEntry.id);
    }
  }, [pointsHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel(`points_log:user_id=eq.${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "points_log",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newEntry = payload.new as any;

            supabase
              .from("users")
              .select("total_points")
              .eq("id", user.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setTotalPoints(Number((data as any).total_points) || 0);
                }
              });

            const formattedEntry: PointLogEntry = {
              id: newEntry.id,
              userId: newEntry.user_id,
              amount: newEntry.amount,
              reason: newEntry.reason,
              createdAt: newEntry.created_at,
              grantedBy: newEntry.created_by ?? newEntry.granted_by,
              grantedByName: null,
              catalogItemId: newEntry.catalog_item_id ?? null,
            };

            setPointsHistory((prev) => [formattedEntry, ...prev].slice(0, 5));

            localStorage.setItem(STORAGE_KEY, newEntry.id);
            if (newEntry.amount > 0) {
              triggerGoldRain();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, []);

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="w-full p-4">
      {/* Level prominent + XP Bar */}
      <div className="rounded-lg border border-hero-border/40 bg-hero-dark/30 px-4 py-4 w-full">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-gold/20 border border-accent-gold/50">
              <Star className="h-5 w-5 text-accent-gold" />
            </div>
            <div>
              <p className="text-[10px] font-barlow font-bold uppercase text-gray-500 tracking-wider">
                Level
              </p>
              <p className="font-cinzel font-bold text-2xl text-hero-vibrant">
                {level}
              </p>
            </div>
          </div>
          <p className="font-barlow text-xs text-gray-500 tabular-nums">
            {totalPoints.toLocaleString("de-DE")} XP
          </p>
        </div>

        {/* Gold gradient XP progress bar */}
        <div className="space-y-1">
          <div className="h-3 w-full overflow-hidden rounded-full border border-hero-border/40 bg-hero-dark/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-700 transition-all duration-700 ease-out"
              style={{
                width: `${progressAnimated}%`,
                boxShadow: "0 0 12px rgba(234, 179, 8, 0.4)",
              }}
            />
          </div>
          <p className="text-[10px] font-barlow uppercase text-gray-500 text-right">
            {gainedInLevel} / {requiredForLevel} bis Level {level + 1}
          </p>
        </div>
      </div>

      {/* History Section (unchanged) */}
      <div className="mt-4">
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between rounded-md border border-hero-border/30 bg-background-dark px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-200 hover:bg-background-card hover:border-hero-border transition-colors"
        >
          <span>Letzte Belohnungen</span>
          {isHistoryOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isHistoryOpen && (
          <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
            {pointsHistory.length === 0 ? (
              <div className="rounded border border-hero-border/20 bg-background-dark p-4 text-center">
                <p className="font-libre text-xs text-gray-500 italic">
                  Noch keine Belohnungen erhalten.
                </p>
              </div>
            ) : (
              pointsHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 rounded border border-hero-border/20 bg-background-dark p-2.5"
                  style={{
                    backgroundImage: "url('/images/pergament-subtle.jpg')",
                    backgroundSize: "cover",
                    backgroundBlendMode: "overlay",
                  }}
                >
                  {entry.amount >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p
                        className={`font-barlow font-bold text-sm ${
                          entry.amount >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {entry.amount >= 0 ? "+" : ""}
                        {entry.amount}
                      </p>
                      <p className="font-libre text-xs text-gray-300 flex-1 truncate">
                        {entry.reason}
                      </p>
                    </div>
                    <p className="font-barlow text-[10px] text-gray-600 uppercase mt-0.5">
                      {formatDate(entry.createdAt)}
                      {entry.grantedByName && ` · von ${entry.grantedByName}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
