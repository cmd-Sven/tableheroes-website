"use client";

import Link from "next/link";
import { Sword, ChevronRight } from "lucide-react";

export type MembershipWithGm = {
  campaign: { id: string; name: string; system: string | null; gm_id: string | null };
  character: { id: string; name: string; class: string; race: string; level: number; avatar_url: string | null } | null;
  gmName: string;
};

type Props = {
  membershipsWithGm: MembershipWithGm[];
};

const MAX_CAMPAIGNS = 3;

export function MyCampaignsCard({ membershipsWithGm }: Props) {
  const displayList = membershipsWithGm.slice(0, MAX_CAMPAIGNS);

  if (membershipsWithGm.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card py-12 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
            <Sword className="h-8 w-8 text-accent-gold" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">Noch keine Kampagnen</h3>
          <p className="max-w-sm font-libre text-gray-400">
            Du nimmst noch an keiner Runde teil. Schau unter „Offene Kampagnen“ nach neuen Abenteuern.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4">
      <ul className="space-y-0 divide-y divide-hero-border/30 rounded-md border border-hero-border/40 bg-hero-dark/20 overflow-hidden">
        {displayList.map((m) => (
          <li key={m.campaign.id}>
            <Link
              href={`/dashboard/campaigns/${m.campaign.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 w-full hover:bg-hero-dark/40 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="font-barlow font-bold text-white truncate group-hover:text-accent-gold transition-colors">
                  {m.campaign.name || "Unbenannt"}
                </p>
                <p className="font-libre text-xs text-gray-500 truncate mt-0.5">
                  {m.character?.name ?? "Kein Charakter"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-500 shrink-0 group-hover:text-accent-gold transition-colors" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
