"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Globe } from "lucide-react";
import { WorldMapCard } from "@/src/components/worlds/WorldMapCard";

type World = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  entries_count?: number;
  campaigns_count?: number;
  npc_count?: number;
  lore_count?: number;
  location_count?: number;
  faction_count?: number;
  images: Array<{ url: string; description: string }>;
  genre?: string | null;
  tech_level?: string | null;
};

type Props = {
  worlds: World[];
};

export function WorldsListClient({ worlds }: Props) {
  const [name, setName] = useState("");
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(`/dashboard/worlds/new?name=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-8">
      {/* Formular: Neue Welt – nur Name, dann Wizard */}
      <section className="rounded-md border border-hero-border bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Neue Welt anlegen
        </h2>
        <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
          <div>
            <label
              htmlFor="world-name"
              className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
            >
              Name der Welt *
            </label>
            <input
              id="world-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mittelerde, Kassadras"
              className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm hover:bg-hero-vibrant transition-colors"
          >
            <Plus className="h-4 w-4" />
            World Wizard starten
          </button>
        </form>
      </section>

      {/* Liste der Welten */}
      <section>
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Deine Welten
        </h2>
        {worlds.length === 0 ? (
          <div className="rounded-md border border-dashed border-hero-dark bg-background-card/50 py-12 text-center">
            <div className="mb-4 grid h-16 w-16 mx-auto place-items-center rounded-full bg-background-dark border border-hero-border">
              <Globe className="h-8 w-8 text-hero-vibrant" />
            </div>
            <p className="font-libre text-gray-400 mb-2">
              Noch keine Welten angelegt.
            </p>
            <p className="font-libre text-sm text-gray-500 max-w-md mx-auto">
              Erstelle zuerst eine Welt, bevor du eine Kampagne anlegst. Alle Lore und NPCs gehören zu einer Welt.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((w) => (
              <li key={w.id} className="min-h-[320px]">
                <WorldMapCard
                  world={{
                    id: w.id,
                    name: w.name,
                    description: w.description,
                    npc_count: w.npc_count ?? 0,
                    lore_count: w.lore_count ?? 0,
                    location_count: w.location_count ?? 0,
                    faction_count: w.faction_count ?? 0,
                    campaigns_count: w.campaigns_count ?? 0,
                    images: w.images ?? [],
                    genre: w.genre ?? null,
                    tech_level: w.tech_level ?? null,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
