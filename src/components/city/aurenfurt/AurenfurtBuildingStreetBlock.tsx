"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Route } from "lucide-react";
import {
  STREETS_STORAGE_KEY,
  parseStoredStreets,
  type AurenfurtStreet,
} from "@/src/components/city/aurenfurt/aurenfurt-streets";
import { nearbyStreetsForBuilding } from "@/src/components/city/aurenfurt/aurenfurt-map-buildings";
import type { CityDistrictId } from "@/src/components/city/aurenfurt/aurenfurt-districts";
import { updateAurenfurtBuildingStreet } from "@/src/components/city/aurenfurt/aurenfurt-map-building-actions";

type Props = {
  locationId: string;
  worldId: string;
  districtId: CityDistrictId | null;
  mapU?: number | null;
  mapV?: number | null;
  streetId: string | null;
  fromEditor: boolean;
  isGm: boolean;
};

function readStreetsFromStorage(): AurenfurtStreet[] {
  if (typeof window === "undefined") return [];
  return parseStoredStreets(window.localStorage.getItem(STREETS_STORAGE_KEY)) ?? [];
}

export function AurenfurtBuildingStreetBlock({
  locationId,
  worldId,
  districtId,
  mapU,
  mapV,
  streetId,
  fromEditor,
  isGm,
}: Props) {
  const [streets, setStreets] = useState<AurenfurtStreet[]>([]);
  const [selectedStreetId, setSelectedStreetId] = useState(streetId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStreets(readStreetsFromStorage());
  }, []);

  useEffect(() => {
    setSelectedStreetId(streetId ?? "");
  }, [streetId]);

  const pin =
    typeof mapU === "number" && typeof mapV === "number" ? { u: mapU, v: mapV } : null;

  const nearby = useMemo(() => {
    if (!districtId) return streets;
    return nearbyStreetsForBuilding(districtId, pin, streets);
  }, [districtId, pin, streets]);

  const linked = nearby.find((s) => s.id === selectedStreetId) ?? streets.find((s) => s.id === selectedStreetId);
  const description = (linked?.description ?? "").trim();
  const active = Boolean(selectedStreetId);

  function saveStreet(nextId: string) {
    setError(null);
    setSelectedStreetId(nextId);
    startTransition(async () => {
      const result = await updateAurenfurtBuildingStreet({
        locationId,
        streetId: nextId || null,
        worldId,
      });
      if (!result.ok) {
        setError(result.error);
        setSelectedStreetId(streetId ?? "");
      }
    });
  }

  if (!fromEditor && !streetId) return null;

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 mb-6">
      <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
        <Route className="h-5 w-5 text-accent-gold" aria-hidden />
        Straße
      </h2>

      {!active ? (
        <p className="font-libre text-sm text-amber-300/90 mb-3">
          Dieses Gebäude ist inaktiv: Es ist keine Straße zugeordnet. NPCs können hier nicht angelegt
          werden, bis eine nahe Straße gewählt ist.
        </p>
      ) : null}

      {isGm ? (
        <label className="block space-y-1 mb-3">
          <span className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
            Nahe Straße dieses Viertels
          </span>
          <select
            value={selectedStreetId}
            disabled={pending}
            onChange={(e) => saveStreet(e.target.value)}
            className="w-full max-w-md rounded border border-hero-dark bg-slate-900 p-2 text-white focus:border-hero-vibrant outline-none font-libre text-sm"
          >
            <option value="">— Keine (Gebäude inaktiv) —</option>
            {nearby.map((street) => (
              <option key={street.id} value={street.id}>
                {street.name || street.id}
              </option>
            ))}
          </select>
          {error ? <p className="font-libre text-xs text-red-400">{error}</p> : null}
        </label>
      ) : selectedStreetId ? (
        <p className="font-libre text-sm text-gray-300 mb-2">
          {linked?.name ?? "Verknüpfte Straße"}
        </p>
      ) : null}

      {description ? (
        <div className="mt-2">
          <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-2">Straßenbeschreibung</h3>
          <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>
      ) : null}
    </div>
  );
}
