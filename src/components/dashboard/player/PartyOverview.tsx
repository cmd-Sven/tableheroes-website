"use client";

import Image from "next/image";
import { Users, User } from "lucide-react";
import type { PartyMember } from "@/src/app/dashboard/campaigns/[id]/player-dashboard/page";

type Props = {
  party: PartyMember[];
  /** Wenn true, kein eigener Abschnittstitel (z. B. gemeinsamer Block mit Session-Card). */
  hideTitle?: boolean;
  /** Wenn true: kein eigener Marmor-Rahmen (Parent liefert Hintergrund). */
  embedded?: boolean;
};

export function PartyOverview({ party, hideTitle = false, embedded = false }: Props) {
  const body = (
    <>
      {!hideTitle && !embedded && (
        <h2 className="font-barlow font-semibold text-2xl text-stone-100 border-b border-white/15 pb-2 mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-gold" />
          Die Gruppe
        </h2>
      )}
      {party.length === 0 ? (
        <p className="font-libre text-stone-400 italic">
          Noch keine weiteren aktiven Charaktere in dieser Kampagne.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {party.map((member) => (
            <div
              key={member.id}
              className="overflow-hidden rounded-lg border bg-party-card-dgreen shadow-md"
            >
              <div className="relative aspect-[4/3] bg-hero-dark/60">
                {member.avatar_url ? (
                  <Image
                    src={member.avatar_url}
                    alt=""
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <User className="h-16 w-16 text-accent-gold/35" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent pt-10 pb-2 px-3">
                  <p className="font-barlow font-extrabold text-lg uppercase text-white truncate">
                    {member.name}
                  </p>
                </div>
              </div>
              <div className="p-3 space-y-1 border-t border-hero-border/20">
                <p className="font-libre text-sm text-gray-200">
                  <span className="text-stone-400">Rasse:</span> {member.race}
                </p>
                <p className="font-libre text-sm text-gray-200">
                  <span className="text-stone-400">Klasse:</span> {member.class}
                </p>
                <p className="font-barlow font-bold text-xs uppercase text-accent-gold">
                  Stufe {member.level != null && member.level > 0 ? member.level : 1}
                </p>
                {member.culture ? (
                  <p className="font-libre text-xs text-stone-500 truncate">{member.culture}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <section className="rounded-lg border border-white/10 bg-player-marble-section p-6 shadow-inner">
      {body}
    </section>
  );
}
