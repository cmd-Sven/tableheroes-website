"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Globe2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createWorldMap,
  deleteWorldMap,
} from "@/src/lib/actions/world-map-actions";
import { uploadWorldMapImage, PROFILE_MEDIA_ACCEPT_MIME } from "@/src/lib/profile-media";
import type { WorldMap } from "@/src/lib/world-maps/types";

type Props = {
  worldId: string;
  worldName: string;
  maps: WorldMap[];
  isGm: boolean;
  basePath: string;
};

export function WorldMapsListClient({
  worldId,
  worldName,
  maps: initialMaps,
  isGm,
  basePath,
}: Props) {
  const router = useRouter();
  const [maps, setMaps] = useState(initialMaps);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  function handleCreate() {
    if (!title.trim()) {
      toast.error("Bitte einen Titel angeben.");
      return;
    }
    if (!file) {
      toast.error("Bitte ein Kartenbild hochladen.");
      return;
    }
    startTransition(async () => {
      try {
        const upload = await uploadWorldMapImage(file, { worldId });
        if ("error" in upload) {
          toast.error(upload.error);
          return;
        }
        const created = await createWorldMap({
          worldId,
          title: title.trim(),
          imageUrl: upload.publicUrl,
          imageStoragePath: upload.path,
        });
        setMaps((prev) => [...prev, created]);
        setTitle("");
        setFile(null);
        setCreating(false);
        toast.success("Weltkarte angelegt.");
        router.push(`${basePath}/${created.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Anlegen fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant flex items-center gap-2">
            <Globe2 className="h-7 w-7 text-accent-gold" />
            Weltkarten
          </h1>
          <p className="mt-1 font-libre text-sm text-gray-400">
            {worldName} — sessionübergreifend, auch außerhalb der Session einsehbar.
          </p>
        </div>
        {isGm && (
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-black"
          >
            <Plus className="h-4 w-4" />
            Neue Karte
          </button>
        )}
      </div>

      {creating && isGm && (
        <div className="space-y-3 rounded border border-hero-border/40 bg-background-dark p-4">
          <label className="block text-sm">
            <span className="font-barlow text-xs uppercase text-gray-400">Titel</span>
            <input
              className="mt-1 w-full rounded border border-hero-border bg-background-card px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Kontinent Faerûn"
            />
          </label>
          <label className="block text-sm">
            <span className="font-barlow text-xs uppercase text-gray-400">Kartenbild</span>
            <input
              type="file"
              accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
              className="mt-1 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={handleCreate}
            className="rounded bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-black disabled:opacity-50"
          >
            Anlegen & öffnen
          </button>
        </div>
      )}

      {maps.length === 0 ? (
        <p className="font-libre text-gray-500 italic">
          Noch keine Weltkarten. {isGm ? "Lege die erste Karte an und setze Markierungen vor der Session." : ""}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m) => (
            <li
              key={m.id}
              className="group relative overflow-hidden rounded border border-hero-border/40 bg-background-dark"
            >
              <Link href={`${basePath}/${m.id}`} className="block">
                <div className="relative aspect-[16/10] bg-black">
                  <Image
                    src={m.image_url}
                    alt={m.title}
                    fill
                    unoptimized
                    className="object-cover opacity-90 transition group-hover:opacity-100"
                  />
                </div>
                <div className="p-3">
                  <div className="font-barlow font-bold uppercase text-hero-vibrant">
                    {m.title}
                  </div>
                </div>
              </Link>
              {isGm && (
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded bg-black/70 p-1.5 text-red-400 hover:text-red-300"
                  title="Löschen"
                  onClick={() => {
                    if (!confirm(`„${m.title}" wirklich löschen?`)) return;
                    startTransition(async () => {
                      try {
                        await deleteWorldMap(m.id, worldId);
                        setMaps((prev) => prev.filter((x) => x.id !== m.id));
                        toast.success("Gelöscht.");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen.");
                      }
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
