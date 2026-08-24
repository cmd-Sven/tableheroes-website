/**
 * LiveSessionLocationToolbarContent — Lore location picker and display name editor for the top toolbar.
 */
"use client";

import { ScrollText, ExternalLink } from "lucide-react";
import type { LiveState, LoreLocationOption } from "./live-session-types";

export type LiveSessionLocationToolbarContentProps = {
  liveState: LiveState | null;
  loreLocationOptions: LoreLocationOption[];
  locationDraft: string;
  setLocationDraft: (value: string) => void;
  changeSessionLocation: (locationId: string) => void;
  updateLiveState: (patch: Partial<LiveState>) => void;
  campaignId: string;
};

export function LiveSessionLocationToolbarContent({
  liveState,
  loreLocationOptions,
  locationDraft,
  setLocationDraft,
  changeSessionLocation,
  updateLiveState,
  campaignId,
}: LiveSessionLocationToolbarContentProps) {
  return (
<div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                    Ort aus Lore
                  </span>
                  <select
                    value={liveState?.current_location_lore_id || ""}
                    onChange={(e) => changeSessionLocation(e.target.value)}
                    className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white outline-none focus:border-accent-gold"
                  >
                    <option value="" className="bg-white text-slate-950">
                      — Kein Lore-Ort —
                    </option>
                    {loreLocationOptions.map((o) => (
                      <option
                        key={o.id}
                        value={o.id}
                        className="bg-white text-slate-950"
                      >
                        {o.name}
                        {o.type ? ` (${o.type})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                    Anzeigename
                  </span>
                  <input
                    type="text"
                    value={locationDraft}
                    onChange={(e) => setLocationDraft(e.target.value)}
                    onBlur={() =>
                      updateLiveState({
                        current_location: locationDraft.trim() || null,
                      })
                    }
                    placeholder="z. B. Hinterraum der Taverne"
                    className="w-full rounded border border-amber-900/60 bg-background-dark px-2 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-accent-gold"
                  />
                </label>
                {liveState?.current_location_lore_id ? (
                  <a
                    href={`/dashboard/campaigns/${campaignId}/lore/${liveState.current_location_lore_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    Lore-Eintrag öffnen
                    <ExternalLink className="h-3 w-3 opacity-80" />
                  </a>
                ) : null}

              </div>
  );
}
