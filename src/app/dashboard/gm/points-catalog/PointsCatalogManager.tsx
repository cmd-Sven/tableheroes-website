"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package, Award, Coins, Pencil, Trash2 } from "lucide-react";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "@/src/lib/actions/points-catalog-actions";
import { getAchievementImageSrc } from "@/src/types/achievement";
import type { CatalogItem } from "@/src/lib/actions/points-catalog-actions";

type AchievementRow = {
  id: string;
  name: string;
  points_awarded: number;
  image_url?: string | null;
};

type Props = {
  imageFilenames: string[];
  achievements: AchievementRow[];
  catalogItems: CatalogItem[];
};

export function PointsCatalogManager({
  imageFilenames,
  achievements,
  catalogItems,
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pointsCost, setPointsCost] = useState(500);
  const [type, setType] = useState<"physical" | "achievement">("physical");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [achievementId, setAchievementId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPointsCost(500);
    setType("physical");
    setImageUrl(null);
    setAchievementId(null);
  }

  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description ?? "");
    setPointsCost(item.points_cost);
    setType(item.type);
    setImageUrl(item.image_url ?? null);
    setAchievementId(item.achievement_id ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte einen Namen eintragen.");
      return;
    }
    if (type === "achievement" && !achievementId) {
      toast.error("Bitte ein Achievement wählen.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = editingId
        ? await updateCatalogItem(
            editingId,
            name.trim(),
            description.trim() || null,
            pointsCost,
            type,
            imageUrl,
            type === "achievement" ? achievementId : null
          )
        : await createCatalogItem(
            name.trim(),
            description.trim() || null,
            pointsCost,
            type,
            imageUrl,
            type === "achievement" ? achievementId : null
          );
      if (result.success) {
        toast.success(editingId ? "Belohnung aktualisiert." : "Belohnung erstellt.");
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error ?? "Fehler.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Belohnung wirklich löschen?")) return;
    const result = await deleteCatalogItem(id);
    if (result.success) {
      toast.success("Belohnung gelöscht.");
      if (editingId === id) resetForm();
      router.refresh();
    } else {
      toast.error(result.error ?? "Fehler beim Löschen.");
    }
  }

  return (
    <div className="space-y-8">
      {/* Formular */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-6">
          {editingId ? "Belohnung bearbeiten" : "Neue Belohnung anlegen"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Würfelbecher"
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white placeholder-gray-500 focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Was bekommt der Spieler?"
              rows={2}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white placeholder-gray-500 focus:border-hero-vibrant outline-none resize-y"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Punktekosten
            </label>
            <input
              type="number"
              min={1}
              value={pointsCost}
              onChange={(e) => setPointsCost(Number(e.target.value) || 0)}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Typ
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as "physical" | "achievement");
                if (e.target.value === "physical") setAchievementId(null);
              }}
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
            >
              <option value="physical">Physische Belohnung</option>
              <option value="achievement">Achievement</option>
            </select>
          </div>
          {type === "achievement" && (
            <div>
              <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
                Achievement
              </label>
              <select
                value={achievementId ?? ""}
                onChange={(e) =>
                  setAchievementId(e.target.value ? e.target.value : null)
                }
                className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
              >
                <option value="">— Bitte wählen —</option>
                {achievements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-barlow font-bold uppercase text-sm text-gray-300 mb-1">
              Bild (optional)
            </label>
            <select
              value={imageUrl ?? ""}
              onChange={(e) =>
                setImageUrl(e.target.value ? e.target.value : null)
              }
              className="w-full rounded border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">— Kein Bild —</option>
              {imageFilenames.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <p className="mt-1 font-libre text-xs text-gray-500">
              Bilder aus public/images/achievement/
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded border border-hero-border bg-hero-dark px-6 py-2 font-barlow font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Wird gespeichert…" : editingId ? "Aktualisieren" : "Erstellen"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-hero-dark px-6 py-2 font-barlow font-bold uppercase text-gray-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Bestehende Einträge */}
      <section
        className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-lg"
        style={{
          backgroundImage: "url('/images/dark-marmor.jpg')",
          backgroundSize: "cover",
        }}
      >
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Katalog-Einträge
        </h2>
        {catalogItems.length === 0 ? (
          <div className="rounded border border-hero-dark/50 bg-hero-dark/30 p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-500" />
            <p className="font-libre text-gray-500 mt-2">
              Noch keine Belohnungen angelegt. Erstelle oben die erste Karte.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalogItems.map((item) => {
              const imgSrc = item.image_url
                ? item.image_url.startsWith("http") || item.image_url.startsWith("/")
                  ? item.image_url
                  : getAchievementImageSrc(item.image_url)
                : null;
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-lg border border-hero-dark bg-hero-dark/30 overflow-hidden"
                >
                  <div className="relative aspect-square bg-hero-dark/50 flex items-center justify-center">
                    {imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={item.name}
                        width={120}
                        height={120}
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        {item.type === "achievement" ? (
                          <Award className="h-16 w-16 text-accent-gold/50" />
                        ) : (
                          <Package className="h-16 w-16 text-accent-gold/50" />
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 font-barlow text-sm font-bold text-accent-gold">
                      <Coins className="h-4 w-4" />
                      {item.points_cost}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-cinzel font-bold text-white">
                      {item.name}
                    </h3>
                    {item.type === "achievement" && item.achievement_name && (
                      <p className="font-barlow text-xs text-accent-gold mt-0.5">
                        {item.achievement_name}
                      </p>
                    )}
                    {item.description && (
                      <p className="font-libre text-sm text-gray-400 mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="flex items-center gap-1 rounded border border-hero-border px-3 py-1.5 font-barlow text-xs font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex items-center gap-1 rounded border border-red-500/50 px-3 py-1.5 font-barlow text-xs font-bold uppercase text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
