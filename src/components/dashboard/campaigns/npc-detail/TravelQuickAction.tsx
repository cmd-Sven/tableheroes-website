/**
 * Quick travel popover to relocate an NPC to another location.
 */
"use client";

import { useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { updateNPCCurrentLocation } from "@/src/app/dashboard/campaigns/[id]/location-actions";

export type TravelQuickActionProps = {
  npcId: string;
  currentLocationId: string;
  locations: Array<{ id: string; name: string; type: string }>;
  campaignId: string;
  onUpdate: () => void;
};

export function TravelQuickAction({
  npcId,
  currentLocationId,
  locations,
  onUpdate,
}: TravelQuickActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateNPCCurrentLocation(npcId, selectedLocationId || null);
        setIsOpen(false);
        setSearchQuery("");
        setSelectedLocationId("");
        onUpdate();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren des Aufenthaltsorts."
        );
      }
    });
  };

  const filteredLocations = locations
    .filter((l) => l.id !== currentLocationId)
    .filter((l) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        l.name.toLowerCase().includes(query) ||
        l.type.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 p-1.5 rounded border border-hero-border bg-hero-dark/40 hover:bg-hero-dark/60 transition-colors text-accent-gold hover:text-hero-vibrant"
        title="Reise"
      >
        <MapPin className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
              setSelectedLocationId("");
            }}
          />

          <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-lg border border-hero-border bg-background-card p-4 shadow-lg">
            <h3 className="font-barlow font-bold text-sm uppercase text-hero-vibrant mb-3">
              Reise
            </h3>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ort suchen..."
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant mb-3"
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto mb-3 border border-hero-dark rounded">
              {filteredLocations.length > 0 ? (
                <div className="divide-y divide-hero-dark">
                  {filteredLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocationId(location.id)}
                      className={`w-full text-left px-3 py-2 font-libre text-sm hover:bg-hero-dark/50 transition-colors ${
                        selectedLocationId === location.id
                          ? "bg-hero-vibrant/20 text-hero-vibrant"
                          : "text-gray-300"
                      }`}
                    >
                      <div className="font-semibold">{location.name}</div>
                      <div className="text-xs text-gray-400">
                        {location.type}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-2 text-center text-gray-400 text-sm font-libre">
                  Keine Orte gefunden
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isPending || !selectedLocationId}
                className="flex-1 rounded border border-hero-border bg-hero-vibrant px-3 py-1.5 font-barlow font-bold text-sm uppercase text-white hover:bg-hero-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "..." : "Speichern"}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                  setSelectedLocationId("");
                }}
                disabled={isPending}
                className="rounded border border-hero-border bg-hero-dark/40 px-3 py-1.5 font-barlow font-bold text-sm uppercase text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
