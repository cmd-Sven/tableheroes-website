"use client";

import Link from "next/link";
import { Star, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { getPointsForLevel } from "@/src/lib/utils/rank-utils";
import type { PointLogEntry } from "@/src/lib/actions/point-actions";

type Props = {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  currentLevelBase: number;
  pointsLog: PointLogEntry[];
};

export function PointsPageClient({
  totalPoints,
  level,
  nextLevelPoints,
  currentLevelBase,
  pointsLog,
}: Props) {
  const gainedInLevel = Math.max(0, totalPoints - currentLevelBase);
  const requiredForLevel =
    nextLevelPoints - currentLevelBase > 0 ? nextLevelPoints - currentLevelBase : 1;
  const progress = Math.max(
    0,
    Math.min(100, (gainedInLevel / requiredForLevel) * 100)
  );

  const levelList = Array.from({ length: Math.max(11, level + 2) }, (_, i) => i + 1).map(
    (lvl) => ({
      level: lvl,
      pointsRequired: getPointsForLevel(lvl),
    })
  );

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-8">
      {/* Punkte & Level Card */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-accent-gold/50 bg-accent-gold/10">
              <Star className="h-8 w-8 text-accent-gold" />
            </div>
            <div>
              <p className="font-barlow text-xs font-bold uppercase tracking-wider text-gray-500">
                Deine Punkte
              </p>
              <p className="font-cinzel text-3xl font-bold text-hero-vibrant">
                {totalPoints.toLocaleString("de-DE")}
              </p>
              <p className="font-barlow text-sm text-accent-gold">
                Level {level}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/points/catalog"
            className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-6 py-3 font-barlow font-bold uppercase text-hero-vibrant transition-colors hover:bg-hero-vibrant/20"
          >
            <ShoppingCart className="h-5 w-5" />
            Punkte ausgeben
          </Link>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs">
            <span className="font-barlow uppercase text-gray-500">
              Fortschritt zu Level {level + 1}
            </span>
            <span className="font-barlow tabular-nums text-gray-400">
              {gainedInLevel} / {requiredForLevel}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border border-hero-border bg-hero-dark/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-700 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Level-Übersicht */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Level & Punkte
        </h2>
        <p className="font-libre text-sm text-gray-400 mb-4">
          So viele Punkte brauchst du für jedes Level:
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {levelList.map(({ level: lvl, pointsRequired }) => (
            <div
              key={lvl}
              className={`rounded border px-4 py-2 ${
                lvl === level
                  ? "border-accent-gold bg-accent-gold/10"
                  : "border-hero-dark bg-hero-dark/30"
              }`}
            >
              <span className="font-barlow font-bold text-hero-vibrant">
                Level {lvl}
              </span>
              <span className="ml-2 font-libre text-gray-300">
                ab {pointsRequired.toLocaleString("de-DE")} Punkte
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Historie */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Punkte-Historie
        </h2>
        <p className="font-libre text-sm text-gray-400 mb-4">
          Alle Belohnungen und Ausgaben im Überblick:
        </p>
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {pointsLog.length === 0 ? (
            <div className="rounded border border-hero-dark/50 bg-hero-dark/30 p-6 text-center">
              <p className="font-libre text-gray-500 italic">
                Noch keine Punkte-Bewegungen.
              </p>
            </div>
          ) : (
            pointsLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded border border-hero-dark/50 bg-hero-dark/30 p-3"
              >
                {entry.amount >= 0 ? (
                  <TrendingUp className="h-5 w-5 shrink-0 text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 shrink-0 text-red-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-barlow font-bold ${
                      entry.amount >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {entry.amount >= 0 ? "+" : ""}
                    {entry.amount}
                  </p>
                  <p className="font-libre text-sm text-gray-300">
                    {entry.reason}
                  </p>
                  <p className="font-barlow text-xs text-gray-500 mt-1">
                    {formatDate(entry.createdAt)}
                    {entry.grantedByName && ` · von ${entry.grantedByName}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
