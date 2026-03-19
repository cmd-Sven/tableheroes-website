"use client";

import { useState, useTransition } from "react";
import { User, Loader2, Save, Info, Shield, Users } from "lucide-react";
import { updateCharacterPlayer } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import Link from "next/link";

type Culture = { id: string; name: string };
type Language = { id: string; name: string };
type Faction = { id: string; name: string };
type Location = { id: string; name: string; type: string };
type Relationship = {
  relationship_type: string;
  description: string | null;
  npcs: { id: string; name: string; role: string | null; title: string | null } | null;
};

type Props = {
  campaignId: string;
  character: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    biography: string | null;
    culture_lore_id: string | null;
    culture_name?: string | null;
    languages: string[];
    language_names?: string[];
    faction_membership: string | null;
    faction_name?: string | null;
    current_location_id: string | null;
    location_name?: string | null;
    status?: string;
    character_relationships?: Relationship[];
  };
  cultures: Culture[];
  languages: Language[];
  factions: Faction[];
  locations: Location[];
  factionReputations?: Array<{ id: string; faction_id: string; faction_name: string; reputation: number; rank?: string | null }>;
};

export function MyCharacterSection({
  campaignId,
  character,
  cultures,
  languages,
  factions,
  locations,
  factionReputations = [],
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: character.name,
    class: character.class,
    race: character.race,
    level: character.level,
    biography: character.biography ?? "",
    culture_lore_id: character.culture_lore_id ?? "",
    languages: character.languages ?? [],
    faction_membership: character.faction_membership ?? "",
    current_location_id: character.current_location_id ?? "",
  });

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCharacterPlayer({
          character_id: character.id,
          campaign_id: campaignId,
          name: form.name,
          class: form.class,
          race: form.race,
          level: form.level,
          biography: form.biography || null,
          culture_lore_id: form.culture_lore_id || null,
          languages: form.languages,
          faction_membership: form.faction_membership || null,
          current_location_id: form.current_location_id || null,
        });
        window.location.reload();
      } catch (e: unknown) {
        alert((e as Error).message || "Fehler beim Speichern.");
      }
    });
  };

  const toggleLanguage = (id: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(id)
        ? prev.languages.filter((l) => l !== id)
        : [...prev.languages, id],
    }));
  };

  const relationships = character.character_relationships ?? [];
  const isPendingApproval = character.status === "Pending_Approval";

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <div className="mb-4 flex items-center justify-between border-b border-hero-border pb-2">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood flex items-center gap-2">
          <User className="h-6 w-6 text-accent-gold" />
          Mein Charakter
        </h2>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Speichern
        </button>
      </div>

      {isPendingApproval && (
        <div className="mb-4 rounded border border-accent-gold/50 bg-accent-gold/10 p-3">
          <p className="font-libre text-sm text-accent-gold">
            Dein Charakter wird vom Spielleiter geprüft. Du kannst erst an Sessions teilnehmen, wenn er freigeschaltet ist.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basis-Daten */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Klasse</label>
            <input
              type="text"
              value={form.class}
              onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Rasse</label>
            <input
              type="text"
              value={form.race}
              onChange={(e) => setForm((p) => ({ ...p, race: e.target.value }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Level</label>
            <input
              type="number"
              min={1}
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: parseInt(e.target.value) || 1 }))}
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
          </div>
          {cultures.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Kultur</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.culture_lore_id}
                  onChange={(e) => setForm((p) => ({ ...p, culture_lore_id: e.target.value }))}
                  className="flex-1 rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Keine --</option>
                  {cultures.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {form.culture_lore_id && (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${form.culture_lore_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark bg-slate-900 p-2 text-gray-500 hover:text-accent-gold"
                    title="Mehr Info"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
          {languages.length > 0 && (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Sprachen</label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <label key={lang.id} className="flex cursor-pointer items-center gap-2 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-gray-200 hover:border-hero-border">
                    <input
                      type="checkbox"
                      checked={form.languages.includes(lang.id)}
                      onChange={() => toggleLanguage(lang.id)}
                      className="rounded border-hero-dark"
                    />
                    {lang.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {factions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Fraktion</label>
              <select
                value={form.faction_membership}
                onChange={(e) => setForm((p) => ({ ...p, faction_membership: e.target.value }))}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
              >
                <option value="">-- Keine --</option>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
          {locations.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Heimatort</label>
              <select
                value={form.current_location_id}
                onChange={(e) => setForm((p) => ({ ...p, current_location_id: e.target.value }))}
                className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
              >
                <option value="">-- Keiner --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Biografie */}
        <div>
          <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Biografie</label>
          <textarea
            value={form.biography}
            onChange={(e) => setForm((p) => ({ ...p, biography: e.target.value }))}
            rows={6}
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            placeholder="Hintergrundgeschichte deines Charakters..."
          />
        </div>

        {/* Beziehungen zu NPCs & Ruf bei Fraktionen */}
        {(relationships.length > 0 || factionReputations.length > 0) && (
          <div className="space-y-4">
            <h3 className="font-barlow font-semibold text-lg text-accent-gold border-b border-hero-border pb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Beziehungen & Ruf
            </h3>

            {relationships.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-barlow font-bold uppercase text-gray-500 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Beziehungen zu NPCs
                </p>
                <ul className="space-y-2">
                  {relationships.map((rel: Relationship, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 rounded border border-hero-border/30 bg-hero-dark/20 px-3 py-2 font-libre text-sm text-gray-200"
                    >
                      <span className="font-semibold text-white">{rel.npcs?.name ?? "Unbekannt"}</span>
                      <span className="text-gray-500">·</span>
                      <span>{rel.relationship_type}</span>
                      {rel.description && (
                        <>
                          <span className="text-gray-500">·</span>
                          <span className="text-gray-400 italic">{rel.description}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {factionReputations.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-barlow font-bold uppercase text-gray-500 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Fraktionen & Ruf
                </p>
                <p className="mb-2 font-libre text-xs text-gray-400 italic">
                  Der Spielleiter verwaltet deinen Ruf und Rang bei Fraktionen.
                </p>
                <div className="space-y-2">
                  {factionReputations.map((rep) => {
                    const statusLabel =
                      rep.reputation >= 80 ? "Vertrauensperson" :
                      rep.reputation >= 50 ? "Respektiert" :
                      rep.reputation >= 20 ? "Bekannt" :
                      rep.reputation >= 0 ? "Neutral" :
                      rep.reputation >= -20 ? "Vorsicht" :
                      rep.reputation >= -50 ? "Feindlich / Schulden" :
                      "Gehasster Feind";
                    const isPrimary = character.faction_membership === rep.faction_id;
                    return (
                      <div
                        key={rep.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2 ${
                          isPrimary ? "border-hero-vibrant/50 bg-hero-dark/30" : "border-hero-border/30 bg-hero-dark/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-libre font-semibold text-white">{rep.faction_name}</span>
                          {isPrimary && (
                            <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-xs font-bold uppercase text-hero-vibrant">
                              Deine Fraktion
                            </span>
                          )}
                          {rep.rank && (
                            <span className="rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-xs font-bold uppercase text-accent-gold">
                              {rep.rank}
                            </span>
                          )}
                          <span className="font-libre text-sm text-gray-500 italic">· {statusLabel}</span>
                        </div>
                        <span
                          className={`shrink-0 rounded px-3 py-1 font-barlow font-bold text-sm ${
                            rep.reputation > 0
                              ? "bg-green-900/50 text-green-400 border border-green-700"
                              : rep.reputation < 0
                              ? "bg-red-900/50 text-red-400 border border-red-700"
                              : "bg-gray-800/50 text-gray-400 border border-gray-600"
                          }`}
                        >
                          {rep.reputation > 0 ? "+" : ""}{rep.reputation}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 font-libre italic">
              Beziehungen und Ruf werden vom Spielleiter verwaltet.
            </p>
          </div>
        )}

        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=character`}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/50 transition-colors"
        >
          <User className="h-4 w-4" />
          Vollständiges Charakterblatt anzeigen
        </Link>
      </div>
    </section>
  );
}
