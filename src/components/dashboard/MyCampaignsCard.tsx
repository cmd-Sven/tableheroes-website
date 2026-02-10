"use client";

import Link from "next/link";
import { Sword } from "lucide-react";

export type MembershipWithGm = {
  campaign: { id: string; name: string; system: string | null; gm_id: string | null };
  character: { id: string; name: string; class: string; race: string; level: number; avatar_url: string | null } | null;
  gmName: string;
};

type Props = {
  membershipsWithGm: MembershipWithGm[];
};

export function MyCampaignsCard({ membershipsWithGm }: Props) {
  if (membershipsWithGm.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-12 text-center">
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
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {membershipsWithGm.map((m) => (
          <Link
            key={m.campaign.id}
            href={`/dashboard/campaigns/${m.campaign.id}`}
            className="block w-full rounded-md border border-hero-border bg-background-card p-4 shadow-lg hover:border-hero-vibrant transition-colors group"
          >
            <div className="mb-3">
              <h3 className="font-cinzel font-bold text-lg text-white mb-1 group-hover:text-accent-gold transition-colors truncate">
                {m.campaign.name || "Unbenannt"}
              </h3>
              <p className="font-barlow font-bold text-gray-500 uppercase text-xs mb-0.5">
                {m.campaign.system || "System offen"}
              </p>
              <p className="font-libre text-xs text-gray-500">GM: {m.gmName}</p>
            </div>
            <div className="pt-3 border-t border-hero-border/30">
              {m.character?.name ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-hero-border bg-hero-dark">
                    {m.character.avatar_url ? (
                      <img src={m.character.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-white font-bold text-sm">
                        {m.character.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-cinzel font-bold text-sm text-accent-gold truncate">{m.character.name}</p>
                    <p className="font-libre text-xs text-gray-400">
                      Lvl {m.character.level || 1} · {m.character.race} · {m.character.class}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="font-libre text-sm text-gray-500 italic">Charakter noch nicht erstellt</p>
              )}
            </div>
            <p className="mt-3 pt-3 border-t border-hero-border/30 text-sm font-barlow font-bold uppercase text-hero-vibrant group-hover:text-white">
              Zum Abenteuer →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
