"use client";

import type { Dispatch, SetStateAction } from "react";
import { MapPin } from "lucide-react";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "../aurenfurt-districts";
import type { UvPoint } from "../aurenfurt-district-polygons";
import {
  POI_INFLUENCE_ASPECTS,
  POI_KINDS,
  formatInfluenceDelta,
  type AurenfurtMapPoi,
  type PoiInfluence,
  type PoiInfluenceAspect,
  type PoiKind,
} from "../aurenfurt-map-pois";
import { uploadLoreImage } from "@/src/lib/profile-media";
import { AURENFURT_WORLD_ID } from "../aurenfurt-district-lore-ids";

export function PoisToolBody({
  pois,
  selectedPoiId,
  selectedPoi,
  placingPoi,
  repositioningPoi,
  poiDraftUv,
  poiDraftDistrictId,
  poiDraftDistrictName,
  poiSaveError,
  savingPoi,
  poiCreateOpen,
  poiName,
  poiDescription,
  poiKind,
  poiImageUrl,
  poiImageUploading,
  poiInfluences,
  setPoiCreateOpen,
  setPoiName,
  setPoiDescription,
  setPoiKind,
  setPoiImageUrl,
  setPoiImageUploading,
  setPoiInfluences,
  onSelectPoi,
  onStartPlacePoi,
  onStartRepositionPoi,
  onCancelPlacePoi,
  onClearPoiDraft,
  onCancelPlaceBuilding,
  onClearBuildingDraft,
  onSavePoi,
}: {
  pois: AurenfurtMapPoi[];
  selectedPoiId: string | null;
  selectedPoi: AurenfurtMapPoi | null;
  placingPoi: boolean;
  repositioningPoi: boolean;
  poiDraftUv: UvPoint | null;
  poiDraftDistrictId: CityDistrictId | null;
  poiDraftDistrictName: string | null;
  poiSaveError: string | null;
  savingPoi: boolean;
  poiCreateOpen: boolean;
  poiName: string;
  poiDescription: string;
  poiKind: PoiKind;
  poiImageUrl: string;
  poiImageUploading: boolean;
  poiInfluences: PoiInfluence[];
  setPoiCreateOpen: Dispatch<SetStateAction<boolean>>;
  setPoiName: Dispatch<SetStateAction<string>>;
  setPoiDescription: Dispatch<SetStateAction<string>>;
  setPoiKind: Dispatch<SetStateAction<PoiKind>>;
  setPoiImageUrl: Dispatch<SetStateAction<string>>;
  setPoiImageUploading: Dispatch<SetStateAction<boolean>>;
  setPoiInfluences: Dispatch<SetStateAction<PoiInfluence[]>>;
  onSelectPoi: (id: string | null) => void;
  onStartPlacePoi: () => void;
  onStartRepositionPoi: () => void;
  onCancelPlacePoi: () => void;
  onClearPoiDraft: () => void;
  onCancelPlaceBuilding: () => void;
  onClearBuildingDraft: () => void;
  onSavePoi: (input: {
    name: string;
    description: string;
    kind: PoiKind;
    imageUrl: string | null;
    influences: PoiInfluence[];
  }) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant">
        Alle besonderen Orte
      </p>

      {pois.length === 0 ? (
        <p className="font-libre text-xs text-gray-500">Noch keine besonderen Orte.</p>
      ) : (
        <ul className="max-h-52 space-y-1 overflow-y-auto">
          {pois.map((poi) => {
            const selected = selectedPoiId === poi.id;
            const districtName =
              AURENFURT_DISTRICTS.find((d) => d.id === poi.districtId)?.name ?? poi.districtId;
            return (
              <li key={poi.id}>
                <button
                  type="button"
                  onClick={() => onSelectPoi(selected ? null : poi.id)}
                  className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                    selected
                      ? "border-accent-gold bg-accent-gold/10"
                      : "border-accent-gold/40 bg-accent-gold/5 hover:border-accent-gold"
                  }`}
                >
                  <p className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
                    {poi.name}
                  </p>
                  <p className="font-libre text-[11px] text-gray-400">
                    {poi.kind} · {districtName}
                    {poi.influences.length > 0
                      ? ` · ${poi.influences.map(formatInfluenceDelta).join(", ")}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPoi && !poiCreateOpen ? (
        <div className="space-y-2 rounded border border-hero-border/40 bg-slate-900/30 p-2">
          <p className="font-libre text-xs text-gray-300 line-clamp-3">{selectedPoi.description}</p>
          <a
            href={`/dashboard/worlds/${AURENFURT_WORLD_ID}/lore/${selectedPoi.id}/edit`}
            target="_blank"
            rel="noopener"
            className="inline-block font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant hover:text-white"
          >
            In Lore bearbeiten
          </a>
          <button
            type="button"
            onClick={() => {
              if (repositioningPoi) onCancelPlacePoi();
              else onStartRepositionPoi();
            }}
            className={`w-full rounded border px-2 py-1.5 font-barlow text-[11px] font-bold uppercase ${
              repositioningPoi
                ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                : "border-hero-border text-gray-200 hover:border-accent-gold"
            }`}
          >
            {repositioningPoi ? "Klick auf Karte…" : "Position neu setzen"}
          </button>
          <p className="font-libre text-[10px] leading-snug text-gray-400">
            Orte liegen frei auf der Karte (kein Sektor-Raster). Im Orte-Modus kannst du den Token
            auch ziehen. Betroffene Sektoren folgen dem Einfluss aus der exakten Position.
          </p>
          {poiSaveError && repositioningPoi ? (
            <p className="font-libre text-[11px] text-red-400" role="alert">
              {poiSaveError}
            </p>
          ) : null}
        </div>
      ) : null}

      {!poiCreateOpen ? (
        <button
          type="button"
          onClick={() => {
            setPoiCreateOpen(true);
            onCancelPlaceBuilding();
            onClearBuildingDraft();
            onClearPoiDraft();
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent-gold/70 bg-accent-gold/10 px-2 py-1.5 font-barlow text-[11px] font-bold uppercase text-accent-gold hover:bg-accent-gold/20"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Ort anlegen
        </button>
      ) : (
        <div className="space-y-2 rounded border border-hero-border/50 bg-slate-900/50 p-2">
          <p className="font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold">
            Neuer besonderer Ort
          </p>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Name</span>
            <input
              value={poiName}
              onChange={(e) => setPoiName(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="z. B. Brunnen der Silbernen Rose"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Beschreibung
            </span>
            <textarea
              value={poiDescription}
              onChange={(e) => setPoiDescription(e.target.value)}
              rows={3}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder="Für Lore und Karte"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Art</span>
            <select
              value={poiKind}
              onChange={(e) => setPoiKind(e.target.value as PoiKind)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-xs uppercase text-white outline-none focus:border-hero-vibrant"
            >
              {POI_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">Bild</span>
            <input
              type="file"
              accept="image/*"
              disabled={poiImageUploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setPoiImageUploading(true);
                try {
                  const result = await uploadLoreImage(file, {
                    worldId: AURENFURT_WORLD_ID,
                  });
                  if ("error" in result) {
                    setPoiImageUrl("");
                    return;
                  }
                  setPoiImageUrl(result.publicUrl);
                } finally {
                  setPoiImageUploading(false);
                }
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-gray-300 file:mr-2 file:rounded file:border-0 file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-[10px] file:font-bold file:uppercase file:text-accent-gold"
            />
            <input
              value={poiImageUrl}
              onChange={(e) => setPoiImageUrl(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
              placeholder={poiImageUploading ? "Upload läuft…" : "oder Bild-URL · sonst Platzhalter"}
            />
          </label>
          <div className="space-y-1.5">
            <p className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
              Einflussfaktoren
            </p>
            {poiInfluences.map((entry, index) => (
              <div key={`${entry.aspect}-${index}`} className="flex items-center gap-1.5">
                <select
                  value={entry.aspect}
                  onChange={(e) => {
                    const aspect = e.target.value as PoiInfluenceAspect;
                    setPoiInfluences((rows) =>
                      rows.map((row, i) => (i === index ? { ...row, aspect } : row)),
                    );
                  }}
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 p-1.5 font-libre text-[11px] text-white outline-none focus:border-hero-vibrant"
                >
                  {POI_INFLUENCE_ASPECTS.map((aspect) => (
                    <option key={aspect.key} value={aspect.key}>
                      {aspect.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step={1}
                  value={entry.delta}
                  onChange={(e) => {
                    const delta = Math.trunc(Number(e.target.value) || 0);
                    setPoiInfluences((rows) =>
                      rows.map((row, i) => (i === index ? { ...row, delta } : row)),
                    );
                  }}
                  className="w-14 shrink-0 rounded border border-hero-dark bg-slate-900 p-1.5 text-right font-libre text-[11px] text-white outline-none focus:border-hero-vibrant"
                />
                <button
                  type="button"
                  aria-label="Einfluss entfernen"
                  onClick={() => setPoiInfluences((rows) => rows.filter((_, i) => i !== index))}
                  className="rounded border border-hero-dark px-1.5 py-1 font-barlow text-[10px] text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setPoiInfluences((rows) => [...rows, { aspect: "prestige", delta: 1 }])
              }
              className="font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:text-accent-gold"
            >
              + Einfluss
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (placingPoi && !repositioningPoi) onCancelPlacePoi();
                else onStartPlacePoi();
              }}
              className={`rounded border px-2 py-1 font-barlow text-[11px] font-bold uppercase ${
                placingPoi && !repositioningPoi
                  ? "border-accent-gold bg-accent-gold/20 text-accent-gold"
                  : "border-hero-border text-gray-200 hover:border-accent-gold"
              }`}
            >
              {placingPoi && !repositioningPoi
                ? "Klick auf Karte…"
                : poiDraftUv
                  ? "Position neu setzen"
                  : "Position setzen"}
            </button>
            {poiDraftUv ? (
              <span className="self-center font-libre text-[10px] text-hero-vibrant">
                {poiDraftDistrictName ? `${poiDraftDistrictName} · ` : ""}
                u={poiDraftUv.u.toFixed(2)} · v={poiDraftUv.v.toFixed(2)}
              </span>
            ) : null}
          </div>
          {poiSaveError && !repositioningPoi ? (
            <p className="font-libre text-[11px] text-red-400" role="alert">
              {poiSaveError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                savingPoi ||
                !poiDraftUv ||
                !poiDraftDistrictId ||
                !poiName.trim() ||
                !poiDescription.trim() ||
                poiInfluences.length === 0
              }
              onClick={() =>
                onSavePoi({
                  name: poiName,
                  description: poiDescription,
                  kind: poiKind,
                  imageUrl: poiImageUrl.trim() || null,
                  influences: poiInfluences,
                })
              }
              className="rounded border border-accent-gold bg-accent-gold/10 px-2 py-1 font-barlow text-[11px] font-bold uppercase text-accent-gold disabled:opacity-40"
            >
              {savingPoi ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPoiCreateOpen(false);
                onCancelPlacePoi();
                onClearPoiDraft();
              }}
              className="rounded border border-hero-dark px-2 py-1 font-barlow text-[11px] font-bold uppercase text-gray-400"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
