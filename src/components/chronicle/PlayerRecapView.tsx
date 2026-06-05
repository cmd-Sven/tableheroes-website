"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { EntityForSmartText } from "@/src/components/ui/SmartText";
import { SmartText } from "@/src/components/ui/SmartText";
import type { PlayerRecapPayload } from "@/src/lib/session-chronicle/types";
import { MapPin, ScrollText, Sparkles, Swords, Users } from "lucide-react";

type Props = {
  campaignId: string;
  worldId?: string | null;
  recap: PlayerRecapPayload;
  /** Spieler-Chronik: Wiki-Links in neuem Tab */
  openLinksInNewTab?: boolean;
};

function SectionBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded border border-hero-border/30 bg-background-dark/70 p-4">
      <h4 className="mb-2 flex items-center gap-2 font-barlow text-xs font-bold uppercase text-accent-gold">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

export function PlayerRecapView({
  campaignId,
  worldId = null,
  recap,
  openLinksInNewTab = false,
}: Props) {
  const entities = recap.link_entities as EntityForSmartText[];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-900/50 bg-[#21180d]/85 p-5 shadow-inner">
        <h3 className="mb-3 flex items-center gap-2 font-cinzel text-xl font-bold text-accent-gold">
          <ScrollText className="h-5 w-5" />
          Was ist passiert?
        </h3>
        <SmartText
          text={recap.summary_md}
          entities={entities}
          campaignId={campaignId}
          worldId={worldId}
          openInNewTab={openLinksInNewTab}
          emptyMessage="Keine Zusammenfassung vorhanden."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recap.sections.npcs.length > 0 ? (
          <SectionBlock title="Begegnungen" icon={<Users className="h-4 w-4" />}>
            <ul className="space-y-2">
              {recap.sections.npcs.map((npc, i) => (
                <li key={`${npc.entity_id ?? npc.name}-${i}`} className="font-libre text-sm text-gray-200">
                  {npc.entity_id ? (
                    <Link
                      href={`/dashboard/campaigns/${campaignId}/npcs/${npc.entity_id}`}
                      target={openLinksInNewTab ? "_blank" : undefined}
                      rel={openLinksInNewTab ? "noopener noreferrer" : undefined}
                      className="font-semibold text-hero-vibrant hover:underline"
                    >
                      {npc.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-200">{npc.name}</span>
                  )}
                  {npc.note ? (
                    <p className="mt-0.5 text-xs text-gray-500">{npc.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}

        {recap.sections.locations.length > 0 ? (
          <SectionBlock title="Orte" icon={<MapPin className="h-4 w-4" />}>
            <ul className="space-y-2">
              {recap.sections.locations.map((loc, i) => (
                <li key={`${loc.entity_id ?? loc.name}-${i}`} className="font-libre text-sm text-gray-200">
                  {loc.entity_id ? (
                    <Link
                      href={`/dashboard/campaigns/${campaignId}/lore/${loc.entity_id}`}
                      target={openLinksInNewTab ? "_blank" : undefined}
                      rel={openLinksInNewTab ? "noopener noreferrer" : undefined}
                      className="font-semibold text-hero-vibrant hover:underline"
                    >
                      {loc.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-200">{loc.name}</span>
                  )}
                  {loc.type ? (
                    <span className="ml-2 text-[10px] uppercase text-gray-500">{loc.type}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}

        {recap.sections.quests_new.length > 0 ? (
          <SectionBlock title="Neue Quests" icon={<Sparkles className="h-4 w-4" />}>
            <ul className="space-y-2">
              {recap.sections.quests_new.map((q, i) => (
                <li key={`${q.quest_id ?? q.title}-${i}`} className="font-libre text-sm text-gray-200">
                  <span className="font-semibold">{q.title}</span>
                  {q.objective ? (
                    <p className="mt-0.5 text-xs text-gray-500">{q.objective}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}

        {recap.sections.loot.length > 0 ? (
          <SectionBlock title="Beute & Funde" icon={<Sparkles className="h-4 w-4" />}>
            <ul className="list-disc space-y-1 pl-5 font-libre text-sm text-gray-200">
              {recap.sections.loot.map((item, i) => (
                <li key={`${item}-${i}`}>{item}</li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}

        {recap.sections.combat_outcomes.length > 0 ? (
          <SectionBlock title="Kämpfe" icon={<Swords className="h-4 w-4" />}>
            <ul className="space-y-1 font-libre text-sm text-gray-200">
              {recap.sections.combat_outcomes.map((c, i) => (
                <li key={i}>{c.summary}</li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}
      </div>
    </div>
  );
}
