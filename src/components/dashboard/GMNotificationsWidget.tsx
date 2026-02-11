"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, UserPlus, ShieldCheck, ExternalLink } from "lucide-react";

export type PendingApplication = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  campaignId: string;
  campaignName: string;
  appliedAt: string | null;
};

type Props = {
  applications: PendingApplication[];
};

export function GMNotificationsWidget({ applications }: Props) {
  const hasApplications = applications.length > 0;

  if (!hasApplications) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center gap-4 rounded-lg border border-hero-border/30 bg-hero-dark/20 p-6">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-hero-border/50 bg-hero-dark/50">
            <ShieldCheck className="h-6 w-6 text-hero-vibrant" />
          </div>
          <div>
            <h3 className="font-cinzel font-bold text-base text-hero-vibrant">
              Alle Reiche sind ruhig
            </h3>
            <p className="font-libre text-sm text-gray-500 mt-0.5">
              Aktuell keine neuen Bewerbungen. Genieße die Ruhe, Meister.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <div
        className="relative rounded-lg border border-purple-800/50 bg-purple-950/10 overflow-hidden shadow-[0_0_20px_rgba(147,51,234,0.15)]"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        {/* Overlay für den violetten Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-transparent to-red-950/20 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-3 border-b border-purple-800/30 px-5 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-900/60 border border-purple-600/50">
            <Bell className="h-4 w-4 text-purple-300 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-barlow font-bold text-sm uppercase text-purple-300">
              Meldungs-Zentrale
            </h3>
            <span className="rounded-full bg-purple-800/60 px-2 py-0.5 font-barlow font-bold text-[10px] text-purple-200 border border-purple-600/40">
              {applications.length}
            </span>
          </div>
        </div>

        {/* Application List */}
        <ul className="relative z-10 divide-y divide-purple-800/20">
          {applications.map((app) => {
            const appliedDate = app.appliedAt
              ? new Intl.DateTimeFormat("de-DE", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(app.appliedAt))
              : null;

            return (
              <li
                key={app.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-purple-950/20 transition-colors"
              >
                {/* Avatar */}
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-purple-600/40 bg-background-dark">
                  {app.avatarUrl ? (
                    <Image
                      src={app.avatarUrl}
                      alt={app.username}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center font-barlow font-bold text-sm text-purple-300">
                      {app.username[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-libre text-sm text-gray-200 leading-snug">
                    <span className="font-bold text-white">
                      {app.username}
                    </span>{" "}
                    bewirbt sich für{" "}
                    <span className="font-bold text-accent-gold">
                      {app.campaignName}
                    </span>
                  </p>
                  {appliedDate && (
                    <p className="font-barlow text-[10px] text-gray-500 uppercase mt-0.5">
                      {appliedDate}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  href={`/dashboard/campaigns/${app.campaignId}/gm-inbox`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-purple-700/50 bg-purple-900/40 px-3 py-1.5 font-barlow font-bold uppercase text-[10px] text-purple-200 hover:bg-purple-800/60 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ansehen
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
