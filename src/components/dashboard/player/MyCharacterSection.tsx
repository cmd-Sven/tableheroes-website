"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Loader2, Save, Info, Shield, Users, ExternalLink } from "lucide-react";
import { updateCharacterPlayer } from "@/src/app/dashboard/campaigns/[id]/character-actions";
import {
  PROFILE_MEDIA_ACCEPT_MIME,
  PROFILE_MEDIA_MAX_BYTES,
  removeProfileMediaAsset,
  uploadCharacterPortrait,
  validateProfileImageFile,
} from "@/src/lib/profile-media";
import { ImageUrlDisplayEditor } from "@/src/components/ui/ImageUrlDisplayEditor";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import type { ImageDisplaySettings } from "@/src/lib/image-display";
import { normalizeImageDisplay } from "@/src/lib/image-display";
import Link from "next/link";
import { CharacterWealthInventoryCard } from "./CharacterWealthInventoryCard";
import { ClientMountGate } from "@/src/components/ui/ClientMountGate";
import { FoundryProgressionLockNotice } from "@/src/components/foundry/FoundryProgressionLockNotice";

type Culture = { id: string; name: string };
type Language = { id: string; name: string };
type Faction = { id: string; name: string };
type Location = { id: string; name: string; type: string };
type Relationship = {
  relationship_type: string;
  description: string | null;
  npcs: { id: string; name: string; role: string | null; title: string | null } | null;
};

function getReputationColorClasses(reputation: number): string {
  if (reputation >= 50) return "border-green-900/60 bg-green-900/20";
  if (reputation >= 20) return "border-green-800/50 bg-green-900/10";
  if (reputation < -50) return "border-red-900/60 bg-red-900/20";
  if (reputation < -20) return "border-red-800/50 bg-red-900/10";
  return "border-hero-border/40 bg-hero-dark/20";
}

function normalizeLangIds(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

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
    languages?: unknown;
    language_names?: string[];
    faction_membership: string | null;
    faction_name?: string | null;
    current_location_id: string | null;
    location_name?: string | null;
    avatar_url?: string | null;
    avatar_storage_path?: string | null;
    /** Zuschnitt / Fokus (wie NPC-Bilddarstellung) */
    avatar_display?: unknown;
    status?: string;
    experience_points?: number;
    character_relationships?: Relationship[];
  };
  cultures: Culture[];
  languages: Language[];
  factions: Faction[];
  locations: Location[];
  factionReputations?: Array<{ id: string; faction_id: string; faction_name: string; reputation: number; rank?: string | null }>;
  progressionLocked?: boolean;
  progressionLockMessage?: string;
};

export function MyCharacterSection({
  campaignId,
  character,
  cultures,
  languages,
  factions,
  locations,
  factionReputations = [],
  progressionLocked = false,
  progressionLockMessage = "",
}: Props) {
  const characterId = String(character?.id ?? "").trim();
  const router = useRouter();
  const savedLangIds = normalizeLangIds(character?.languages);

  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: character?.name ?? "",
    class: character?.class ?? "",
    race: character?.race ?? "",
    level: Math.max(1, Math.round(Number(character?.level ?? 1)) || 1),
    experience_points: Number(character?.experience_points ?? 0),
    biography: character?.biography ?? "",
    culture_lore_id: character?.culture_lore_id ?? "",
    languages: savedLangIds,
    faction_membership: character?.faction_membership ?? "",
    current_location_id: character?.current_location_id ?? "",
    avatar_url: character?.avatar_url ?? "",
  });
  const [avatarStoragePath, setAvatarStoragePath] = useState(
    character?.avatar_storage_path ?? null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [avatarDisplay, setAvatarDisplay] = useState<ImageDisplaySettings>(() =>
    normalizeImageDisplay(character?.avatar_display),
  );

  useEffect(() => {
    setAvatarDisplay(normalizeImageDisplay(character?.avatar_display));
  }, [character?.avatar_display, character?.avatar_url, character?.avatar_storage_path]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);

  const cultureOptions = useMemo(() => {
    const cid = form.culture_lore_id || character?.culture_lore_id || "";
    const list = cultures.map((c) => ({ ...c }));
    if (cid && !list.some((x) => x.id === cid)) {
      list.push({
        id: cid,
        name: character?.culture_name?.trim() || "Gespeicherte Kultur",
      });
    }
    return list;
  }, [cultures, form.culture_lore_id, character?.culture_lore_id, character?.culture_name]);

  const factionOptions = useMemo(() => {
    const fid = form.faction_membership || character?.faction_membership || "";
    const list = factions.map((f) => ({ ...f }));
    if (fid && !list.some((x) => x.id === fid)) {
      list.push({
        id: fid,
        name: character?.faction_name?.trim() || "Gespeicherte Fraktion",
      });
    }
    return list;
  }, [factions, form.faction_membership, character?.faction_membership, character?.faction_name]);

  const locationOptions = useMemo(() => {
    const lid = form.current_location_id || character?.current_location_id || "";
    const list = locations.map((l) => ({ ...l }));
    if (lid && !list.some((x) => x.id === lid)) {
      list.push({
        id: lid,
        name: character?.location_name?.trim() || "Gespeicherter Ort",
        type: "",
      });
    }
    return list;
  }, [locations, form.current_location_id, character?.current_location_id, character?.location_name]);

  /** Freigegebene Sprachen + alle aktuell gewählten IDs (auch wenn Visibility später ändert) */
  const languageOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const l of languages) map.set(l.id, l);
    const names = character?.language_names ?? [];
    for (const id of form.languages) {
      if (!map.has(id)) {
        const idx = savedLangIds.indexOf(id);
        const label =
          idx >= 0 && names[idx] && names[idx] !== id
            ? names[idx]
            : `Gespeichert (${id.slice(0, 8)}…)`;
        map.set(id, { id, name: label });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [languages, form.languages, character?.language_names, savedLangIds]);

  const handleSave = () => {
    if (!characterId) {
      alert("Charakter-ID fehlt.");
      return;
    }
    startTransition(async () => {
      try {
        let nextAvatarUrl = form.avatar_url.trim() || null;
        let nextAvatarPath = avatarStoragePath;

        if (avatarFile) {
          const r = await uploadCharacterPortrait(avatarFile, {
            characterId,
          });
          if ("error" in r) {
            alert(r.error);
            return;
          }
          nextAvatarUrl = r.publicUrl;
          nextAvatarPath = r.path;
        }

        if (!nextAvatarUrl) nextAvatarPath = null;

        await updateCharacterPlayer({
          character_id: characterId,
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
          avatar_url: nextAvatarUrl,
          avatar_storage_path: nextAvatarPath,
          avatar_display: nextAvatarUrl ? normalizeImageDisplay(avatarDisplay) : null,
          experience_points: form.experience_points,
        });

        const prevPath = character?.avatar_storage_path ?? null;
        if (prevPath && prevPath !== nextAvatarPath) {
          await removeProfileMediaAsset(prevPath);
        }

        setAvatarFile(null);
        router.refresh();
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

  const relationships = character?.character_relationships ?? [];
  const isPendingApproval = character?.status === "Pending_Approval";

  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-black hover:bg-yellow-500 transition-colors disabled:opacity-60 shadow-lg"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Speichern
    </button>
  );

  return (
    <section className="rounded-lg border border-hero-dark bg-background-card p-6">
      <div className="mb-4 flex items-center justify-between border-b border-hero-border pb-2">
        <h2 className="font-barlow font-semibold text-2xl text-accent-blood flex items-center gap-2">
          <User className="h-6 w-6 text-accent-gold" />
          Mein Charakter
        </h2>
        {saveButton}
      </div>

      {isPendingApproval && (
        <div className="mb-4 rounded border border-accent-gold/50 bg-accent-gold/10 p-3">
          <p className="font-libre text-sm text-accent-gold">
            Dein Charakter wird vom Spielleiter geprüft. Du kannst erst an Sessions teilnehmen, wenn er freigeschaltet ist.
          </p>
        </div>
      )}

      {progressionLocked && progressionLockMessage ? (
        <div className="mb-4">
          <FoundryProgressionLockNotice message={progressionLockMessage} />
        </div>
      ) : null}

      <ClientMountGate
        fallback={
          <div className="space-y-6 animate-pulse" aria-hidden>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <div className="mb-1 h-3 w-16 rounded bg-hero-dark/50" />
                  <div className="h-10 rounded border border-hero-dark/40 bg-slate-900/40" />
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 h-3 w-20 rounded bg-hero-dark/50" />
              <div className="h-32 rounded border border-hero-dark/40 bg-slate-900/40" />
            </div>
          </div>
        }
      >
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
              readOnly={progressionLocked}
              onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))}
              className={`w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none ${progressionLocked ? "cursor-not-allowed opacity-60" : ""}`}
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
              readOnly={progressionLocked}
              onChange={(e) => setForm((p) => ({ ...p, level: parseInt(e.target.value) || 1 }))}
              className={`w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none ${progressionLocked ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </div>
          <div id="character-erfahrung" className="scroll-mt-24">
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Erfahrungspunkte
            </label>
            <input
              type="number"
              min={0}
              value={form.experience_points}
              readOnly={progressionLocked}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  experience_points: Math.max(0, parseInt(e.target.value, 10) || 0),
                }))
              }
              className={`w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none ${progressionLocked ? "cursor-not-allowed opacity-60" : ""}`}
            />
          </div>
          <div id="character-gold" className="scroll-mt-24 sm:col-span-2">
            <CharacterWealthInventoryCard
              character={{
                id: characterId,
                name: character?.name ?? "",
                class: character?.class ?? "",
                level: Math.max(1, Math.round(Number(character?.level ?? 1)) || 1),
                avatar_url: character?.avatar_url ?? null,
              }}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 space-y-3">
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Charakterbild
            </label>
            <p className="font-libre text-xs text-gray-500">
              Bild hochladen oder per URL einbinden. Den Ausschnitt stellst du wie bei NPC-Portraits ein
              (Cover/Contain, Fokus).
            </p>
            <div className="flex flex-wrap items-start gap-4">
              {avatarBlobUrl || form.avatar_url.trim() ? (
                <CharacterAvatarImage
                  src={avatarBlobUrl || form.avatar_url.trim()}
                  avatarDisplay={avatarDisplay}
                  className="h-28 w-28 shrink-0 rounded-lg border-2 border-hero-border bg-hero-dark"
                  alt=""
                />
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-hero-border/60 bg-hero-dark/40 px-2 text-center font-libre text-[10px] text-gray-500">
                  Kein Bild
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  type="file"
                  accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
                  className="block w-full max-w-md text-sm text-gray-300 file:mr-2 file:rounded file:border file:border-hero-border file:bg-hero-dark file:px-2 file:py-1 file:font-barlow file:text-xs file:uppercase file:text-hero-vibrant"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) return;
                    const msg = validateProfileImageFile(f);
                    if (msg) {
                      alert(msg);
                      return;
                    }
                    setAvatarFile(f);
                  }}
                />
                <p className="font-libre text-xs text-gray-500">
                  Upload max. {Math.round(PROFILE_MEDIA_MAX_BYTES / 1024 / 1024)} MB (JPEG/PNG/WebP). URL
                  und Upload schließen sich beim Speichern gegenseitig nicht aus: zuletzt gewähltes Bild
                  zählt (Upload hat Vorrang).
                </p>
                {(form.avatar_url.trim() || avatarBlobUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarFile(null);
                      setForm((p) => ({ ...p, avatar_url: "" }));
                      setAvatarStoragePath(null);
                      setAvatarDisplay(normalizeImageDisplay(null));
                    }}
                    className="text-sm font-libre text-red-400 hover:underline"
                  >
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">
              Bild-URL (optional, statt Upload)
            </label>
            <input
              type="url"
              value={form.avatar_url}
              onChange={(e) => {
                setForm((p) => ({ ...p, avatar_url: e.target.value }));
                if (e.target.value.trim()) setAvatarStoragePath(null);
              }}
              placeholder="https://…"
              className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            />
            {(form.avatar_url.trim() || avatarBlobUrl) ? (
              <ImageUrlDisplayEditor
                value={avatarDisplay}
                onChange={setAvatarDisplay}
                previewUrl={avatarBlobUrl || form.avatar_url.trim() || null}
                previewAspectClassName="aspect-[3/4] max-w-[220px]"
              />
            ) : null}
          </div>
          {cultureOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Kultur</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.culture_lore_id}
                  onChange={(e) => setForm((p) => ({ ...p, culture_lore_id: e.target.value }))}
                  className="flex-1 rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Keine --</option>
                  {cultureOptions.map((c) => (
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
          <div id="character-sprachen" className="sm:col-span-2 lg:col-span-3 scroll-mt-24">
            <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Sprachen</label>
            {languageOptions.length === 0 ? (
              <p className="font-libre text-sm text-gray-500 italic">
                Für diese Kampagne sind keine freigegebenen Sprachen hinterlegt. Kontaktiere deinen Spielleiter, falls du Sprachen wählen sollst.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((lang) => (
                  <label
                    key={lang.id}
                    className="flex cursor-pointer items-center gap-2 rounded border border-hero-dark bg-slate-900/80 px-3 py-2 font-libre text-sm text-gray-200 hover:border-hero-border"
                  >
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
            )}
          </div>
          {factionOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Fraktion</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.faction_membership}
                  onChange={(e) => setForm((p) => ({ ...p, faction_membership: e.target.value }))}
                  className="flex-1 rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Keine --</option>
                  {factionOptions.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {form.faction_membership && (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/factions/${form.faction_membership}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark bg-slate-900 p-2 text-gray-500 hover:text-accent-gold"
                    title="Fraktion anzeigen"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
          {locationOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Heimatort</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.current_location_id}
                  onChange={(e) => setForm((p) => ({ ...p, current_location_id: e.target.value }))}
                  className="flex-1 rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
                >
                  <option value="">-- Keiner --</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                      {loc.type ? ` (${loc.type})` : ""}
                    </option>
                  ))}
                </select>
                {form.current_location_id && (
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/lore/${form.current_location_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded border border-hero-dark bg-slate-900 p-2 text-gray-500 hover:text-accent-gold"
                    title="Ort in der Lore anzeigen"
                  >
                    <Info className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Biografie */}
        <div id="character-biografie" className="scroll-mt-24">
          <label className="mb-1 block text-xs font-barlow font-bold uppercase text-gray-500">Biografie</label>
          <textarea
            value={form.biography}
            onChange={(e) => setForm((p) => ({ ...p, biography: e.target.value }))}
            rows={6}
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white focus:border-hero-vibrant outline-none"
            placeholder="Hintergrundgeschichte deines Charakters..."
          />
        </div>

        {/* Beziehungen zu NPCs & Ruf bei Fraktionen – Card Design */}
        {(relationships.length > 0 || factionReputations.length > 0) && (
          <div id="character-beziehungen" className="space-y-6 scroll-mt-24">
            <h3 className="font-barlow font-semibold text-lg text-accent-gold border-b border-hero-border pb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Beziehungen & Ruf
            </h3>

            {relationships.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-barlow font-bold uppercase text-gray-500 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Beziehungen zu NPCs
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {relationships.map((rel: Relationship, idx: number) => {
                    const npc = rel.npcs;
                    const npcHref = npc?.id ? `/dashboard/campaigns/${campaignId}/npcs/${npc.id}` : null;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-hero-dark bg-background-card p-4 shadow-lg hover:border-hero-vibrant/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {npcHref ? (
                              <Link
                                href={npcHref}
                                className="font-cinzel font-bold text-accent-gold hover:text-hero-vibrant flex items-center gap-1.5 group"
                              >
                                {npc?.name ?? "Unbekannt"}
                                <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="font-cinzel font-bold text-white">{npc?.name ?? "Unbekannt"}</span>
                            )}
                            {(npc?.title || npc?.role) && (
                              <p className="font-libre text-xs text-gray-500 mt-0.5">
                                {npc.title ?? npc.role}
                              </p>
                            )}
                            <p className="font-libre text-sm text-accent-gold mt-1">{rel.relationship_type}</p>
                            {rel.description && (
                              <p className="font-libre text-sm text-gray-400 mt-1 italic">{rel.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {factionReputations.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-barlow font-bold uppercase text-gray-500 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Fraktionen & Ruf
                </p>
                <p className="mb-3 font-libre text-xs text-gray-400 italic">
                  Der Spielleiter verwaltet deinen Ruf und Rang bei Fraktionen.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {factionReputations.map((rep) => {
                    const statusLabel =
                      rep.reputation >= 80 ? "Vertrauensperson" :
                      rep.reputation >= 50 ? "Respektiert" :
                      rep.reputation >= 20 ? "Bekannt" :
                      rep.reputation >= 0 ? "Neutral" :
                      rep.reputation >= -20 ? "Vorsicht" :
                      rep.reputation >= -50 ? "Feindlich / Schulden" :
                      "Gehasster Feind";
                    const isPrimary = character?.faction_membership === rep.faction_id;
                    const colorClasses = getReputationColorClasses(rep.reputation);
                    return (
                      <Link
                        key={rep.id}
                        href={`/dashboard/campaigns/${campaignId}/factions/${rep.faction_id}`}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${isPrimary ? "border-hero-vibrant/50 bg-hero-dark/30" : colorClasses}`}
                      >
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-cinzel font-bold text-white">{rep.faction_name}</span>
                          {isPrimary && (
                            <span className="rounded bg-hero-vibrant/20 px-1.5 py-0.5 font-barlow text-xs font-bold uppercase text-hero-vibrant shrink-0">
                              Deine Fraktion
                            </span>
                          )}
                          {rep.rank && (
                            <span className="rounded bg-accent-gold/20 px-2 py-0.5 font-barlow text-xs font-bold uppercase text-accent-gold shrink-0">
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
                        <ExternalLink className="h-4 w-4 text-gray-500 shrink-0" />
                      </Link>
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
          href={`/dashboard/campaigns/${campaignId}?tab=overview`}
          className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/50 transition-colors"
        >
          <User className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>

        <div className="mt-10 flex flex-col gap-3 border-t border-hero-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-libre text-sm text-gray-400">
            Alle Änderungen (Name, Punkte, Gold, Bild, …) werden mit „Speichern“ übernommen.
          </p>
          {saveButton}
        </div>
      </div>
      </ClientMountGate>
    </section>
  );
}
