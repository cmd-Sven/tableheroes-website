"use client";

import { Scale } from "lucide-react";
import type { CampaignRulesSystemPayload } from "@/src/app/dashboard/campaigns/[id]/rules-system-queries";
import { FlawsCatalogPanel } from "./FlawsCatalogPanel";
import { FatePointsRulesPanel } from "./FatePointsRulesPanel";
import { RulesPresetsPanel } from "./RulesPresetsPanel";

type Props = CampaignRulesSystemPayload;

export function CampaignRulesSystemManagement({
  campaignId,
  campaignName,
  isGM,
  flaws,
  fatePointsRules,
  presets,
}: Props) {
  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-hero-vibrant" aria-hidden />
          <h1 className="font-barlow text-4xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Regelsystem
          </h1>
        </div>
        <p className="font-libre text-gray-400">
          Makel und Schicksalspunkte für <span className="text-gray-200">{campaignName}</span>
          {isGM ? " — du bearbeitest als Spielleiter." : " — Übersicht für alle Spieler."}
        </p>
      </header>

      {isGM ? (
        <section>
          <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
            Regelvorlagen
          </h2>
          <RulesPresetsPanel
            campaignId={campaignId}
            campaignName={campaignName}
            presets={presets}
          />
        </section>
      ) : null}

      <section>
        <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
          Makel-Katalog
        </h2>
        <FlawsCatalogPanel campaignId={campaignId} flaws={flaws} isGM={isGM} />
      </section>

      <section>
        <h2 className="font-barlow text-2xl font-semibold text-accent-blood border-b border-hero-border pb-2 mb-4 mt-8">
          Schicksalspunkte
        </h2>
        <FatePointsRulesPanel
          campaignId={campaignId}
          rules={fatePointsRules}
          isGM={isGM}
        />
      </section>
    </div>
  );
}
