"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Shield, Search, Info } from "lucide-react";
import {
  updateCharacterByGM,
  deleteCharacterByGM,
} from "@/src/app/dashboard/campaigns/[id]/character-actions";
import type { FactionReputation } from "@/src/app/dashboard/campaigns/[id]/reputation-queries";
import {
  getCharacterFactionReputations,
  upsertCharacterFactionReputation,
  deleteCharacterFactionReputation,
} from "@/src/app/dashboard/campaigns/[id]/reputation-actions";

function normalizeLanguageIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

type Character = {
  id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  status?: string;
  biography?: string | null;
  culture_lore_id?: string | null;
  languages?: unknown;
  faction_membership?: string | null;
  current_location_id?: string | null;
  avatar_url?: string | null;
  character_relationships?: Array<{
    id: string;
    relationship_type: string;
    description: string | null;
    npcs: {
      id: string;
      name: string;
      role: string | null;
      title: string | null;
    } | null;
  }>;
};

type NPC = {
  id: string;
  name: string;
  role: string | null;
  title: string | null;
};

type Faction = { id: string; name: string };

type LoreOpt = { id: string; name: string };
type LocOpt = { id: string; name: string; type: string };

type Props = {
  character: Character;
  campaignId: string;
  npcs: NPC[];
  /** Fraktionen für Ruf-UI */
  factions?: Faction[];
  cultures?: LoreOpt[];
  languages?: LoreOpt[];
  locations?: LocOpt[];
  /** Dropdown „Fraktion“ (Charakter) */
  factionChoices?: Faction[];
  /** Vom Server geladen (RSC); nach router.refresh() aktualisiert */
  initialFactionReputations: FactionReputation[];
};

export function GMCharacterEditorPage({
  character,
  campaignId,
  npcs,
  factions = [],
  cultures = [],
  languages = [],
  locations = [],
  factionChoices = [],
  initialFactionReputations,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reputations, setReputations] = useState<FactionReputation[]>(
    initialFactionReputations,
  );
  const [loadingReputations, setLoadingReputations] = useState(false);
  const [repPending, setRepPending] = useState(false);
  const [newRepFactionId, setNewRepFactionId] = useState("");
  const [newRepValue, setNewRepValue] = useState(0);
  const [newRepRank, setNewRepRank] = useState("");
  const [status, setStatus] = useState(character.status || "Active");
  const [level, setLevel] = useState(character.level || 1);
  const [biography, setBiography] = useState(character.biography || "");
  const [charName, setCharName] = useState(character.name);
  const [characterClass, setCharacterClass] = useState(character.class);
  const [charRace, setCharRace] = useState(character.race);
  const [cultureLoreId, setCultureLoreId] = useState(character.culture_lore_id ?? "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() =>
    normalizeLanguageIds(character.languages),
  );
  const [factionMembership, setFactionMembership] = useState(character.faction_membership ?? "");
  const [currentLocationId, setCurrentLocationId] = useState(character.current_location_id ?? "");
  const [avatarUrl, setAvatarUrl] = useState(character.avatar_url ?? "");
  const [relationships, setRelationships] = useState<
    Array<{
      id?: string;
      npc_id: string;
      relationship_type: string;
      description: string;
    }>
  >(
    (character.character_relationships || []).map((rel) => ({
      id: rel.id,
      npc_id: rel.npcs?.id || "",
      relationship_type: rel.relationship_type,
      description: rel.description || "",
    }))
  );

  const [npcSearch, setNpcSearch] = useState<Record<number, string>>({});
  const [factionSearch, setFactionSearch] = useState("");

  const languageOptions = useMemo(() => {
    const map = new Map<string, LoreOpt>();
    for (const l of languages) map.set(l.id, l);
    for (const id of selectedLanguages) {
      if (!map.has(id)) map.set(id, { id, name: `Gespeichert (${id.slice(0, 8)}…)` });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [languages, selectedLanguages]);

  const cultureOptions = useMemo(() => {
    const cid = character.culture_lore_id ?? "";
    const list = [...cultures];
    if (cid && !list.some((x) => x.id === cid)) {
      list.push({ id: cid, name: "Gespeicherter Eintrag" });
    }
    return list;
  }, [cultures, character.culture_lore_id]);

  const factionOptionsForChar = useMemo(() => {
    const fid = character.faction_membership ?? "";
    const list = [...factionChoices];
    if (fid && !list.some((x) => x.id === fid)) {
      list.push({ id: fid, name: "Gespeicherter Eintrag" });
    }
    return list;
  }, [factionChoices, character.faction_membership]);

  const locationOptions = useMemo(() => {
    const lid = character.current_location_id ?? "";
    const list = [...locations];
    if (lid && !list.some((x) => x.id === lid)) {
      list.push({ id: lid, name: "Gespeicherter Eintrag", type: "" });
    }
    return list;
  }, [locations, character.current_location_id]);

  const toggleLanguage = (id: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    setReputations(initialFactionReputations);
  }, [initialFactionReputations]);

  const handleAddRelationship = () => {
    setRelationships([
      ...relationships,
      { npc_id: "", relationship_type: "", description: "" },
    ]);
  };

  const handleRemoveRelationship = (index: number) => {
    setRelationships(relationships.filter((_, i) => i !== index));
  };

  const handleUpdateRelationship = (
    index: number,
    field: "npc_id" | "relationship_type" | "description",
    value: string
  ) => {
    const updated = [...relationships];
    updated[index] = { ...updated[index], [field]: value };
    setRelationships(updated);
  };

  const handleDeleteCharacter = () => {
    if (isPending) return;
    if (
      !confirm(
        `Charakter „${character.name}" wirklich entfernen? Der Spieler kann danach einen neuen Charakter anlegen.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteCharacterByGM(character.id, campaignId);
        router.push(`/dashboard/campaigns/${campaignId}?tab=members`);
        router.refresh();
      } catch (error) {
        alert((error as Error).message || "Charakter konnte nicht entfernt werden.");
      }
    });
  };

  const handleSave = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        await updateCharacterByGM({
          character_id: character.id,
          campaign_id: campaignId,
          status,
          level,
          name: charName.trim() || character.name,
          class: characterClass,
          race: charRace,
          biography: biography || null,
          culture_lore_id: cultureLoreId || null,
          languages: selectedLanguages,
          faction_membership: factionMembership || null,
          current_location_id: currentLocationId || null,
          avatar_url: avatarUrl.trim() || null,
          relationships: relationships.filter(
            (r) => r.npc_id && r.relationship_type
          ),
        });
        router.push(`/dashboard/campaigns/${campaignId}?tab=members`);
        router.refresh();
      } catch (error: unknown) {
        alert((error as Error).message || "Fehler beim Speichern der Änderungen.");
      }
    });
  };

  const handleAddReputation = async () => {
    if (!newRepFactionId || repPending) return;
    setRepPending(true);
    try {
      await upsertCharacterFactionReputation({
        campaign_id: campaignId,
        character_id: character.id,
        faction_id: newRepFactionId,
        reputation: newRepValue,
        rank: newRepRank.trim() || null,
      });
      const list = await getCharacterFactionReputations(character.id, campaignId);
      setReputations(list);
      setNewRepFactionId("");
      setNewRepValue(0);
      setNewRepRank("");
      setFactionSearch("");
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const handleDeleteReputation = async (repId: string) => {
    if (repPending) return;
    setRepPending(true);
    try {
      await deleteCharacterFactionReputation({ campaign_id: campaignId, reputation_id: repId });
      setReputations((prev) => prev.filter((r) => r.id !== repId));
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const handleUpdateReputation = async (rep: FactionReputation, updates: { reputation?: number; rank?: string | null }) => {
    if (repPending) return;
    setRepPending(true);
    try {
      await upsertCharacterFactionReputation({
        campaign_id: campaignId,
        character_id: character.id,
        faction_id: rep.faction_id,
        reputation: updates.reputation ?? rep.reputation,
        rank: updates.rank !== undefined ? updates.rank : rep.rank,
      });
      setReputations((prev) =>
        prev.map((r) =>
          r.id === rep.id
            ? { ...r, reputation: updates.reputation ?? r.reputation, rank: updates.rank !== undefined ? updates.rank : r.rank }
            : r
        )
      );
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRepPending(false);
    }
  };

  const factionsWithoutRep = factions.filter((f) => !reputations.some((r) => r.faction_id === f.id));
  const filteredFactionsForAdd = factionSearch.trim()
    ? factionsWithoutRep.filter((f) =>
        f.name.toLowerCase().includes(factionSearch.trim().toLowerCase())
      )
    : factionsWithoutRep;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">
          Charakter verwalten
        </h1>
        <p className="font-libre text-lg text-gray-300 mt-2">
          {character.name} — {character.class}, {character.race}
        </p>
      </div>

      {/* Stammdaten: alle Felder wie im Wizard / Spieler-Editor */}
      <div className="rounded-lg border border-hero-dark bg-background-card p-6">
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Stammdaten & Herkunft
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Name</label>
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Klasse</label>
            <input
              type="text"
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
              disabled={isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Rasse</label>
            <input
              type="text"
              value={charRace}
              onChange={(e) => setCharRace(e.target.value)}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
              disabled={isPending}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">
              Avatar-URL (Bild-Link)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
              disabled={isPending}
            />
          </div>
          {cultureOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Kultur</label>
              <div className="flex items-center gap-2">
                <select
                  value={cultureLoreId}
                  onChange={(e) => setCultureLoreId(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                  disabled={isPending}
                >
                  <option value="">— Keine —</option>
                  {cultureOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {cultureLoreId ? (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${cultureLoreId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark p-2 text-gray-400 hover:text-accent-gold"
                    title="Lore öffnen"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
          {factionOptionsForChar.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Fraktion</label>
              <div className="flex items-center gap-2">
                <select
                  value={factionMembership}
                  onChange={(e) => setFactionMembership(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                  disabled={isPending}
                >
                  <option value="">— Keine —</option>
                  {factionOptionsForChar.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                {factionMembership ? (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/factions/${factionMembership}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark p-2 text-gray-400 hover:text-accent-gold"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
          {locationOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-400">Heimatort</label>
              <div className="flex items-center gap-2">
                <select
                  value={currentLocationId}
                  onChange={(e) => setCurrentLocationId(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-white outline-none focus:border-accent-gold"
                  disabled={isPending}
                >
                  <option value="">— Keiner —</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.type ? ` (${loc.type})` : ""}
                    </option>
                  ))}
                </select>
                {currentLocationId ? (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${currentLocationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark p-2 text-gray-400 hover:text-accent-gold"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-xs font-barlow font-bold uppercase text-gray-400">Sprachen</label>
          {languageOptions.length === 0 ? (
            <p className="font-libre text-sm text-gray-500 italic">Keine Sprachen in der Welt definiert.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((lang) => (
                <label
                  key={lang.id}
                  className="flex cursor-pointer items-center gap-2 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-gray-200 hover:border-hero-border"
                >
                  <input
                    type="checkbox"
                    checked={selectedLanguages.includes(lang.id)}
                    onChange={() => toggleLanguage(lang.id)}
                    className="rounded border-hero-dark"
                    disabled={isPending}
                  />
                  {lang.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Linke Spalte: Status, Level, Biografie */}
        <div className="space-y-6">
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Charakter-Status
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  disabled={isPending}
                >
                  <option value="Active">Aktiv (spielbar)</option>
                  <option value="Approved">Freigegeben</option>
                  <option value="Pending_Approval">Wartet auf Freigabe</option>
                  <option value="Draft">Entwurf</option>
                  <option value="Dead">Tot</option>
                  <option value="Archived">Archiviert</option>
                  <option value="Rejected">Abgelehnt</option>
                </select>
                {status === "Dead" && (
                  <p className="mt-2 font-libre text-sm text-yellow-400 italic">
                    Wenn der Status auf „Tot“ gesetzt wird, kann der Spieler einen neuen Charakter erstellen.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Level
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                  className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-white outline-none transition-all focus:border-accent-gold"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Hintergrundgeschichte / Biografie
            </h2>
            <textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={12}
              className="w-full rounded border border-hero-dark bg-slate-900/80 p-4 font-libre text-white outline-none transition-all focus:border-accent-gold resize-y"
              placeholder="Die Hintergrundgeschichte des Charakters…"
              disabled={isPending}
            />
            <p className="mt-2 text-sm text-gray-500 font-libre italic">
              Der GM kann die Biografie bearbeiten, um Notizen zu machen oder Inhalte anzupassen.
            </p>
          </div>
        </div>

        {/* Rechte Spalte: Beziehungen & Ruf */}
        <div className="space-y-6">
          {/* Beziehungen */}
          <div
            id="gm-character-npc-relations"
            className="rounded-lg border border-hero-dark bg-background-card p-6 scroll-mt-24"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2">
                Beziehungen & Kontakte
              </h2>
              <button
                type="button"
                onClick={handleAddRelationship}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 rounded border border-hero-border bg-hero-dark font-barlow font-bold uppercase text-sm text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Beziehung hinzufügen
              </button>
            </div>

            {relationships.length === 0 ? (
              <p className="font-libre text-gray-500 italic text-center py-8 border border-hero-border/30 rounded bg-background-dark">
                Noch keine Beziehungen definiert.
              </p>
            ) : (
              <div className="space-y-4">
                {relationships.map((rel, index) => {
                  const availableForThis = npcs.filter(
                    (npc) =>
                      !relationships.some(
                        (r, i) => i !== index && r.npc_id === npc.id
                      ) || rel.npc_id === npc.id
                  );
                  const search = npcSearch[index] ?? "";
                  const filteredNPCs = search.trim()
                    ? availableForThis.filter((n) =>
                        n.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                        (n.title ?? "").toLowerCase().includes(search.trim().toLowerCase()) ||
                        (n.role ?? "").toLowerCase().includes(search.trim().toLowerCase())
                      )
                    : availableForThis;

                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-hero-border bg-hero-dark/30 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              NPC suchen
                            </label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                              <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                  setNpcSearch((prev) => ({ ...prev, [index]: e.target.value }))
                                }
                                placeholder="Name, Rolle oder Titel eingeben…"
                                className="w-full pl-10 pr-3 py-2 rounded border border-hero-dark bg-slate-900/80 text-sm font-libre text-white outline-none focus:border-accent-gold"
                                disabled={isPending}
                              />
                            </div>
                            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-hero-dark bg-background-dark">
                              {filteredNPCs.length === 0 ? (
                                <p className="p-3 text-sm text-gray-500 italic">Keine passenden NPCs</p>
                              ) : (
                                filteredNPCs
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map((npc) => (
                                    <button
                                      key={npc.id}
                                      type="button"
                                      onClick={() => {
                                        handleUpdateRelationship(index, "npc_id", npc.id);
                                        setNpcSearch((prev) => ({ ...prev, [index]: "" }));
                                      }}
                                      className={`w-full px-3 py-2 text-left text-sm font-libre hover:bg-hero-dark/50 transition-colors ${
                                        rel.npc_id === npc.id
                                          ? "bg-hero-vibrant/20 text-hero-vibrant border-l-2 border-hero-vibrant"
                                          : "text-gray-200"
                                      }`}
                                    >
                                      {npc.name}
                                      {npc.title ? ` (${npc.title})` : npc.role ? ` — ${npc.role}` : ""}
                                    </button>
                                  ))
                              )}
                            </div>
                            {rel.npc_id && (
                              <p className="mt-1 text-xs text-accent-gold">
                                Ausgewählt: {npcs.find((n) => n.id === rel.npc_id)?.name ?? "—"}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              Beziehungstyp
                            </label>
                            <input
                              type="text"
                              value={rel.relationship_type}
                              onChange={(e) =>
                                handleUpdateRelationship(index, "relationship_type", e.target.value)
                              }
                              placeholder="z.B. Mentor, Feind, Verbündeter"
                              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                              disabled={isPending}
                            />
                          </div>
                          <div>
                            <label className="block mb-1 text-xs font-barlow font-bold uppercase text-gray-400">
                              Beschreibung (optional)
                            </label>
                            <input
                              type="text"
                              value={rel.description}
                              onChange={(e) =>
                                handleUpdateRelationship(index, "description", e.target.value)
                              }
                              placeholder="Kurze Beschreibung der Beziehung"
                              className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                              disabled={isPending}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelationship(index)}
                          disabled={isPending}
                          className="p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50 shrink-0"
                          title="Entfernen"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ruf bei Fraktionen */}
          <div id="gm-character-faction-reputation" className="scroll-mt-24">
          {factions.length > 0 ? (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent-gold" />
                Ruf bei Fraktionen
              </h2>

              {factionsWithoutRep.length > 0 && (
                <div className="mb-6 p-4 rounded border border-hero-border bg-hero-dark/30 space-y-3">
                  <label className="block font-barlow font-bold text-sm uppercase text-gray-300">
                    Neue Fraktion hinzufügen
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      value={factionSearch}
                      onChange={(e) => setFactionSearch(e.target.value)}
                      placeholder="Fraktion suchen…"
                      className="w-full pl-10 pr-3 py-2 rounded border border-hero-dark bg-slate-900/80 text-sm font-libre text-white outline-none focus:border-accent-gold"
                      disabled={repPending}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded border border-hero-dark bg-background-dark">
                    {filteredFactionsForAdd.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500 italic">Keine passenden Fraktionen</p>
                    ) : (
                      filteredFactionsForAdd.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setNewRepFactionId(f.id);
                            setFactionSearch("");
                          }}
                          className={`w-full px-3 py-2 text-left text-sm font-libre hover:bg-hero-dark/50 transition-colors ${
                            newRepFactionId === f.id
                              ? "bg-hero-vibrant/20 text-hero-vibrant"
                              : "text-gray-200"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))
                    )}
                  </div>
                  {newRepFactionId && (
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <span className="font-libre text-sm text-accent-gold">
                        Ausgewählt: {factions.find((f) => f.id === newRepFactionId)?.name ?? "—"}
                      </span>
                      <input
                        type="text"
                        value={newRepRank}
                        onChange={(e) => setNewRepRank(e.target.value)}
                        placeholder="Rang (z.B. Explorer)"
                        className="w-36 rounded border border-hero-dark bg-slate-900/80 px-2 py-1.5 text-sm font-libre text-white outline-none focus:border-accent-gold"
                        disabled={repPending}
                      />
                      <input
                        type="number"
                        min={-100}
                        max={100}
                        value={newRepValue}
                        onChange={(e) => setNewRepValue(parseInt(e.target.value) || 0)}
                        className="w-20 rounded border border-hero-dark bg-slate-900/80 px-2 py-1.5 text-sm text-center text-white"
                        disabled={repPending}
                      />
                      <button
                        type="button"
                        onClick={handleAddReputation}
                        disabled={repPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-hero-border bg-hero-dark font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant disabled:opacity-50"
                      >
                        {repPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {loadingReputations ? (
                <p className="font-libre text-gray-500 italic py-4">Lade Ruf…</p>
              ) : reputations.length === 0 ? (
                <p className="font-libre text-gray-500 italic py-6 border border-hero-border/30 rounded bg-background-dark text-center">
                  Noch kein Ruf bei Fraktionen. Der Spieler sieht hier seine Beziehungen zu Fraktionen.
                </p>
              ) : (
                <div className="space-y-3">
                  {reputations.map((rep) => (
                    <div
                      key={rep.id}
                      className="flex flex-wrap items-center gap-4 p-4 rounded border border-hero-border bg-hero-dark/30"
                    >
                      <span className="font-libre font-semibold text-white min-w-[140px]">{rep.faction_name}</span>
                      <input
                        key={`${rep.id}-rank-${rep.rank ?? ""}`}
                        type="text"
                        defaultValue={rep.rank ?? ""}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (rep.rank ?? "")) handleUpdateReputation(rep, { rank: v || null });
                        }}
                        placeholder="Rang (z.B. Explorer)"
                        className="w-36 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 text-sm font-libre text-white outline-none focus:border-accent-gold"
                        disabled={repPending}
                      />
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={rep.reputation}
                        onChange={(e) => handleUpdateReputation(rep, { reputation: parseInt(e.target.value) || 0 })}
                        disabled={repPending}
                        className="flex-1 min-w-[100px] accent-hero-vibrant"
                      />
                      <span
                        className={`font-barlow font-bold w-12 text-center text-lg ${
                          rep.reputation > 0 ? "text-green-400" : rep.reputation < 0 ? "text-red-400" : "text-gray-400"
                        }`}
                      >
                        {rep.reputation}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReputation(rep.id)}
                        disabled={repPending}
                        className="p-2 rounded text-red-400 hover:bg-red-900/20 transition-colors"
                        title="Entfernen"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-hero-dark bg-background-card p-6">
              <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent-gold" />
                Ruf bei Fraktionen
              </h2>
              <p className="font-libre text-sm text-gray-500">
                Noch keine Fraktionen in dieser Kampagne. Lege welche an, um Ruf und
                Ränge zu verwalten.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-hero-dark bg-background-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=members`}
            className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Abbrechen
          </Link>
          <button
            type="button"
            onClick={handleDeleteCharacter}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-red-800/60 font-barlow font-bold uppercase text-sm text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Charakter entfernen
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-8 py-3 rounded bg-hero-vibrant font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Speichere…
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Speichern
            </>
          )}
        </button>
      </div>
    </div>
  );
}
