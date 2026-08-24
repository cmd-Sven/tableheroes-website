"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createSessionBattlemap,
  deleteSessionBattlemap,
  updateSessionBattlemapGrid,
} from "@/src/lib/actions/battlemap-actions";
import { BattlemapGridOverlay } from "@/src/components/session/battlemap/BattlemapGridOverlay";
import { isEmptyParchmentBattlemap } from "@/src/lib/session/empty-battlemap";
import {
  DEFAULT_BATTLEMAP_GRID,
  type BattlemapGridConfig,
  type SessionBattlemap,
} from "@/src/lib/session/battlemap-types";
import { uploadBattlemapImage, PROFILE_MEDIA_ACCEPT_MIME } from "@/src/lib/profile-media";

type Props = {
  sessionId: string;
  campaignId: string;
  initialBattlemaps: SessionBattlemap[];
  onRefresh: () => void;
};

type GridSliderKey = "cellSizePx" | "originX" | "originY" | "columns" | "rows";

function GridSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
          {label}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v)) return;
            onChange(Math.min(max, Math.max(min, Math.round(v))));
          }}
          className="w-16 rounded border border-hero-border bg-slate-900/80 px-1.5 py-0.5 text-right text-xs text-white"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hero-dark accent-hero-vibrant"
      />
    </label>
  );
}

export function StagePrepBattlemaps({
  sessionId,
  campaignId,
  initialBattlemaps,
  onRefresh,
}: Props) {
  const [maps, setMaps] = useState(initialBattlemaps);
  const [selectedId, setSelectedId] = useState<string | null>(initialBattlemaps[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMaps(initialBattlemaps);
    if (!initialBattlemaps.some((m) => m.id === selectedId)) {
      setSelectedId(initialBattlemaps[0]?.id ?? null);
    }
  }, [initialBattlemaps, selectedId]);

  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);

  const selected = useMemo(
    () => maps.find((m) => m.id === selectedId) ?? null,
    [maps, selectedId],
  );

  const [gridDraft, setGridDraft] = useState<BattlemapGridConfig>(
    selected?.grid_config ?? DEFAULT_BATTLEMAP_GRID,
  );
  const [previewSize, setPreviewSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (selected) setGridDraft(selected.grid_config);
  }, [selected?.id, selected?.grid_config]);

  // Beim Bildwechsel Default-Größe zurücksetzen, bis onLoad die echten Maße liefert
  useEffect(() => {
    setPreviewSize({ width: 1200, height: 800 });
  }, [selected?.id, selected?.image_url]);

  const sliderDefs = useMemo(() => {
    const maxOriginX = Math.max(0, previewSize.width - 8);
    const maxOriginY = Math.max(0, previewSize.height - 8);
    const maxCell = Math.max(
      8,
      Math.min(200, Math.floor(Math.min(previewSize.width, previewSize.height) / 2)),
    );
    return [
      {
        key: "cellSizePx" as GridSliderKey,
        label: "Zellengröße (px)",
        min: 8,
        max: maxCell,
      },
      {
        key: "originX" as GridSliderKey,
        label: "Versatz X (links)",
        min: 0,
        max: maxOriginX,
      },
      {
        key: "originY" as GridSliderKey,
        label: "Versatz Y (oben)",
        min: 0,
        max: maxOriginY,
      },
      {
        key: "columns" as GridSliderKey,
        label: "Spalten",
        min: 1,
        max: 120,
      },
      {
        key: "rows" as GridSliderKey,
        label: "Zeilen",
        min: 1,
        max: 120,
      },
    ];
  }, [previewSize.height, previewSize.width]);

  function updateGridKey(key: GridSliderKey, value: number) {
    setGridDraft((prev) => ({ ...prev, [key]: value }));
  }

  function resetNewForm() {
    setNewTitle("");
    setNewFile(null);
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPreview(null);
  }

  function handleCreate() {
    if (!newTitle.trim()) {
      toast.error("Bitte einen Titel für die Battlemap angeben.");
      return;
    }
    if (!newFile) {
      toast.error("Bitte ein Bild hochladen (JPG, PNG oder WebP).");
      return;
    }

    startTransition(async () => {
      try {
        const upload = await uploadBattlemapImage(newFile, { sessionId });
        if ("error" in upload) throw new Error(upload.error);

        const created = await createSessionBattlemap({
          sessionId,
          campaignId,
          title: newTitle.trim(),
          imageUrl: upload.publicUrl,
          imageStoragePath: upload.path,
          sortOrder: maps.length,
        });
        setMaps((prev) => [...prev, created]);
        setSelectedId(created.id);
        setGridDraft(created.grid_config);
        resetNewForm();
        toast.success("Battlemap angelegt.");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
      }
    });
  }

  function saveGrid() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const updated = await updateSessionBattlemapGrid(
          selected.id,
          sessionId,
          campaignId,
          gridDraft,
        );
        setMaps((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success("Raster-Konfiguration gespeichert.");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function handleDelete(map: SessionBattlemap) {
    if (!confirm(`„${map.title}" wirklich löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteSessionBattlemap(map.id, sessionId, campaignId);
        const next = maps.filter((m) => m.id !== map.id);
        setMaps(next);
        if (selectedId === map.id) {
          setSelectedId(next[0]?.id ?? null);
        }
        toast.success("Battlemap gelöscht.");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
      }
    });
  }

  /** Vorschau so skalieren, dass sie in den Container passt, Raster bleibt pixelgenau. */
  const previewDisplayScale = Math.min(1, 720 / Math.max(previewSize.width, 1));

  return (
    <section
      className="rounded-xl border border-hero-border p-5 space-y-5"
      style={{ background: "rgba(0,0,0,0.35)" }}
    >
      <div>
        <h2 className="font-cinzel text-xl text-hero-vibrant">Battlemaps</h2>
        <p className="mt-1 text-sm text-gray-400 font-libre">
          Karten für die Live-Session vorbereiten, Raster kalibrieren und in der Session aktivieren.
          Die leere Pergament-Karte (60×60) steht immer zur Auswahl bereit.
        </p>
      </div>

      <div className="rounded-lg border border-hero-border/60 bg-black/25 p-4 space-y-3">
        <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">Neue Battlemap</h3>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Titel (z. B. „Kerker Ebene 1“)"
          className="w-full rounded border border-hero-border bg-slate-900/80 px-3 py-2 text-sm text-white"
        />
        <input
          type="file"
          accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (newPreview) URL.revokeObjectURL(newPreview);
            setNewFile(file);
            setNewPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="block w-full text-sm text-gray-300"
        />
        {newPreview ? (
          <div className="relative aspect-video max-w-lg overflow-hidden rounded-lg border border-hero-border">
            <Image src={newPreview} alt="" fill unoptimized className="object-contain bg-black" />
          </div>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={handleCreate}
          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 text-sm font-barlow font-bold uppercase text-accent-gold disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Battlemap hinzufügen
        </button>
      </div>

      {maps.length === 0 ? (
        <p className="text-sm text-gray-500 font-libre italic">
          Noch keine Battlemaps — die leere Pergament-Karte erscheint automatisch, sobald die
          Session geladen wird. Du kannst zusätzlich eigene Karten hochladen.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-2">
            <p className="font-barlow text-xs font-bold uppercase text-gray-500">Vorhandene Maps</p>
            <ul className="space-y-2">
              {maps.map((m) => {
                const isSystemEmpty = isEmptyParchmentBattlemap(m);
                return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id);
                      setGridDraft(m.grid_config);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      selectedId === m.id
                        ? "border-hero-vibrant bg-hero-vibrant/10"
                        : "border-hero-border/50 bg-black/20 hover:border-hero-border"
                    }`}
                  >
                    <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded bg-black/40">
                      {m.image_url ? (
                        <Image src={m.image_url} alt="" fill unoptimized className="object-cover" />
                      ) : (
                        <ImageIcon className="m-auto h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate font-cinzel text-sm text-white">
                      {m.title}
                      {isSystemEmpty ? (
                        <span className="ml-2 font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold">
                          Standard · 60×60
                        </span>
                      ) : null}
                    </span>
                    {isSystemEmpty ? null : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(m);
                      }}
                      className="shrink-0 text-red-400 hover:text-red-300"
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    )}
                  </button>
                </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="font-barlow text-xs font-bold uppercase text-accent-gold">
                  Raster kalibrieren — {selected.title}
                </p>
                <p className="mt-1 font-libre text-xs text-gray-400">
                  {isEmptyParchmentBattlemap(selected)
                    ? "Standardkarte: festes 60×60-Raster auf Pergament. Raster kann bei Bedarf angepasst werden."
                    : "Schieberegler bewegen — das Raster aktualisiert sich live auf der Vorschau."}{" "}
                  Bild: {previewSize.width}×{previewSize.height}px
                </p>
              </div>

              <div className="overflow-auto rounded-lg border border-hero-border bg-black p-2">
                <div
                  className="relative mx-auto origin-top"
                  style={{
                    width: previewSize.width * previewDisplayScale,
                    height: previewSize.height * previewDisplayScale,
                  }}
                >
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: previewSize.width,
                      height: previewSize.height,
                      transform: `scale(${previewDisplayScale})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <Image
                      src={selected.image_url}
                      alt={selected.title}
                      width={previewSize.width}
                      height={previewSize.height}
                      unoptimized
                      className="block max-h-none max-w-none select-none"
                      style={{ width: previewSize.width, height: previewSize.height }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        const width = img.naturalWidth || 1200;
                        const height = img.naturalHeight || 800;
                        setPreviewSize((prev) =>
                          prev.width === width && prev.height === height
                            ? prev
                            : { width, height },
                        );
                      }}
                    />
                    <BattlemapGridOverlay
                      config={gridDraft}
                      mapWidth={previewSize.width}
                      mapHeight={previewSize.height}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-hero-border/50 bg-black/30 p-3">
                {sliderDefs.map((def) => (
                  <GridSlider
                    key={def.key}
                    label={def.label}
                    value={gridDraft[def.key]}
                    min={def.min}
                    max={def.max}
                    onChange={(v) => updateGridKey(def.key, v)}
                  />
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={gridDraft.showGrid}
                  onChange={(e) =>
                    setGridDraft((prev) => ({ ...prev, showGrid: e.target.checked }))
                  }
                />
                Raster in Live-Session anzeigen
              </label>

              <button
                type="button"
                disabled={pending}
                onClick={saveGrid}
                className="inline-flex items-center gap-2 rounded border border-hero-vibrant px-4 py-2 font-barlow text-xs font-bold uppercase text-hero-vibrant disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                Raster speichern
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
