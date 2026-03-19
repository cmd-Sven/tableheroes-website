"use client";

import Image from "next/image";
import { Users, User } from "lucide-react";
import type { PartyMember } from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

type Props = {
  party: PartyMember[];
};

export function PartyOverview({ party }: Props) {
  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Users className="h-6 w-6 text-accent-gold" />
        Die Gruppe
      </h2>
      {party.length === 0 ? (
        <p className="font-libre text-gray-500 italic">
          Noch keine weiteren aktiven Charaktere in dieser Kampagne.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {party.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-4 rounded-lg border border-hero-border/30 bg-hero-dark/20 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-hero-border bg-hero-dark">
                {member.avatar_url ? (
                  <Image
                    src={member.avatar_url}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-accent-gold/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-barlow font-bold text-white truncate">{member.name}</p>
                <p className="font-libre text-sm text-gray-400">
                  {member.class} · {member.race}
                  {member.culture && ` · ${member.culture}`}
                  {member.level != null && member.level > 0 && ` · Stufe ${member.level}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
