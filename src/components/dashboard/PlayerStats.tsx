"use client";

import { Award, Star } from "lucide-react";

export type Achievement = {
  id: string;
  name: string;
  icon?: string | null;
};

type Props = {
  totalPoints: number;
  achievements: Achievement[];
  /** Wenn false, keine eigene Überschrift (z. B. wenn in DashboardCard mit Header) */
  showHeading?: boolean;
};

export function PlayerStats({ totalPoints, achievements, showHeading = true }: Props) {
  const content = (
    <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex items-center gap-3 rounded-lg border border-hero-border/40 bg-hero-dark/30 px-5 py-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-gold/20 border border-accent-gold/50">
            <Star className="h-6 w-6 text-accent-gold" />
          </div>
          <div>
            <p className="text-xs font-barlow font-bold uppercase text-gray-500">Gesamtpunkte</p>
            <p className="font-cinzel font-bold text-2xl text-hero-vibrant">{totalPoints}</p>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-barlow font-bold uppercase text-gray-500 mb-2">Achievements</p>
          {achievements.length === 0 ? (
            <p className="font-libre text-sm text-gray-500 italic">
              Noch keine Achievements freigeschaltet.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {achievements.map((a) => (
                <li
                  key={a.id}
                  className="inline-flex items-center gap-2 rounded border border-hero-border/40 bg-hero-dark/20 px-3 py-2 font-libre text-sm text-gray-200"
                  title={a.name}
                >
                  {a.icon ? (
                    <span className="text-lg" aria-hidden>{a.icon}</span>
                  ) : (
                    <Award className="h-4 w-4 text-accent-gold/70 shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]">{a.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
  );

  if (!showHeading) return content;
  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Award className="h-6 w-6 text-accent-gold" />
        Punkte & Achievements
      </h2>
      {content}
    </section>
  );
}
