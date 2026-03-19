"use client";

import { useState } from "react";
import { NPCForm } from "@/src/components/dashboard/campaigns/npcs/NPCForm";
import { NPCWizard, type GeneratedNPCData } from "@/src/components/worlds/NPCWizard";

type Props = {
  worldId: string;
  defaultRole?: string;
  /** Optional: Ort für current_location_id und home_location_id (z.B. von Orts-Detailseite). */
  defaultLocationId?: string;
  /** Optional: Name/Fraktion/Beschreibung (z.B. von Fraktions-Detail „NPC anlegen“). */
  defaultName?: string;
  defaultFactionId?: string;
  defaultDescription?: string;
  /** Optional: Kampagnen dieser Welt für Secret-Verknüpfung. */
  campaigns?: Array<{ id: string; name: string }>;
  /** Fraktionen dieser Welt (für Fraktions-Dropdown). */
  factions?: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string; type: string }>;
};

export function WorldNewNPCClient({ worldId, defaultRole, defaultLocationId, defaultName, defaultFactionId, defaultDescription, campaigns = [], factions = [], locations }: Props) {
  const [prefillData, setPrefillData] = useState<GeneratedNPCData | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const initialData = prefillData
    ? {
        name: prefillData.name,
        title: prefillData.title ?? undefined,
        role: prefillData.role ?? undefined,
        race: prefillData.race ?? undefined,
        status: prefillData.status ?? undefined,
        alignment: prefillData.alignment ?? undefined,
        description: prefillData.description ?? undefined,
        appearance: prefillData.appearance ?? undefined,
        personality_traits: prefillData.personality_traits ?? undefined,
        gm_notes: prefillData.gm_notes ?? undefined,
        narrative_hooks: prefillData.narrative_hooks ?? undefined,
        check_results: prefillData.check_results ?? undefined,
        true_nature: prefillData.true_nature ?? undefined,
        hidden_agenda: prefillData.hidden_agenda ?? undefined,
      }
    : undefined;

  const suggestedSecret = prefillData?.suggested_secret ?? undefined;

  return (
    <div className="space-y-6">
      {/* Optionaler Kampagnen-Selektor für das Geheimnis */}
      {campaigns.length > 0 && (
        <div className="rounded-lg border border-hero-border bg-background-card p-4">
          <label className="block mb-2 font-barlow font-bold text-xs uppercase text-gray-400">
            Vorgeschlagenes Geheimnis verknüpfen mit Kampagne …
          </label>
          <select
            value={selectedCampaignId ?? ""}
            onChange={(e) => setSelectedCampaignId(e.target.value || null)}
            className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white focus:border-hero-vibrant outline-none"
          >
            <option value="">Keine Kampagne (nur Welt-NPC anlegen)</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 font-libre text-xs text-gray-500">
            Wenn eine Kampagne gewählt ist und der KI-Wizard ein Geheimnis liefert, wird beim Erstellen automatisch ein
            npc_secret für diese Kampagne angelegt.
          </p>
        </div>
      )}

      <NPCWizard
        worldId={worldId}
        campaignId={selectedCampaignId}
        defaultRole={defaultRole}
        onApply={(data) => setPrefillData(data)}
      />
      <NPCForm
        key={prefillData ? "prefilled" : "empty"}
        worldId={worldId}
        campaignId={selectedCampaignId ?? undefined}
        defaultRole={defaultRole}
        defaultLocationId={defaultLocationId}
        defaultName={defaultName}
        defaultFactionId={defaultFactionId}
        defaultDescription={defaultDescription}
        initialData={initialData as any}
        factions={factions}
        locations={locations}
        suggestedSecret={suggestedSecret}
      />
    </div>
  );
}
