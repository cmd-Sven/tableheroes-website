"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Star,
  Eye,
  EyeOff,
  User,
  BookOpen,
  Heart,
  ScrollText,
  FileText,
  Loader2,
  MapPin,
  Users,
  Sparkles,
  Dice5,
} from "lucide-react";
import { toggleNPCFavorite, updateNPC } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { toggleSecretGlobal } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";
import { CheckResultsEditor } from "@/src/components/dashboard/campaigns/npcs/CheckResultsEditor";
import { RelationshipWizard } from "@/src/components/worlds/RelationshipWizard";
import { RelationshipCard } from "@/src/components/worlds/RelationshipCard";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";
import { SmartText } from "@/src/components/ui/SmartText";
import { useWorldEntities } from "@/src/hooks/useWorldEntities";
import type { RelationshipWithNames } from "@/src/app/dashboard/worlds/relationship-actions";
import type { WorldBlueprint } from "@/src/types/world";

type Secret = {
  id: string;
  campaign_id?: string;
  title: string | null;
  content: string;
  is_revealed: boolean;
  character_ids?: string[];
};

type Props = {
  npc: any;
  worldId: string;
  worldName: string;
  userId: string;
  isGM: boolean;
  secrets: Secret[];
  campaignNames: Record<string, string>;
  worldBlueprint?: WorldBlueprint | null;
  relationships?: RelationshipWithNames[];
};

const STATUS_LABELS: Record<string, string> = {
  Alive: "Lebendig",
  Deceased: "Verstorben",
  Missing: "Vermisst",
  Unknown: "Unbekannt",
};

export function WorldNPCDetailClient({
  npc,
  worldId,
  worldName,
  userId,
  isGM,
  secrets,
  campaignNames,
  worldBlueprint = null,
  relationships = [],
}: Props) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(!!npc.is_favorite);
  const [favPending, setFavPending] = useState(false);
  const [togglingSecretId, setTogglingSecretId] = useState<string | null>(null);
  const [playerView, setPlayerView] = useState(false);
  const { entities } = useWorldEntities(worldId);

  // Relationship Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<RelationshipWithNames | null>(null);

  type CheckResult = {
    type: "Wahrnehmung" | "Motiv erkennen" | "Wissen";
    dc: number;
    result: string;
    is_critical: boolean;
  };

  const parseCheckResults = (raw: any): CheckResult[] => {
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(raw);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
        : [];
    return list;
  };

  const [checkResults, setCheckResults] = useState<CheckResult[]>(() => parseCheckResults(npc.check_results));
  const [savingChecks, setSavingChecks] = useState(false);
  const [gmNotes, setGmNotes] = useState<string>(npc.gm_notes || "");
  const [hiddenAgenda, setHiddenAgenda] = useState<string>((npc as any).hidden_agenda || "");
  const [trueNature, setTrueNature] = useState<string>((npc as any).true_nature || "");
  const [savingSecrets, setSavingSecrets] = useState(false);

  const handleToggleFavorite = async () => {
    setFavPending(true);
    try {
      await toggleNPCFavorite(npc.id, isFavorite);
      setIsFavorite(!isFavorite);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Aktualisieren des Favoriten.");
    } finally {
      setFavPending(false);
    }
  };

  const handleToggleSecretReveal = async (secret: Secret) => {
    setTogglingSecretId(secret.id);
    try {
      await toggleSecretGlobal(secret.id, !secret.is_revealed);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Umschalten der Sichtbarkeit.");
    } finally {
      setTogglingSecretId(null);
    }
  };

  const handleSaveSecrets = async () => {
    setSavingSecrets(true);
    try {
      await updateNPC(npc.id, {
        gm_notes: gmNotes || undefined,
        hidden_agenda: hiddenAgenda || undefined,
        true_nature: trueNature || undefined,
      });
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Speichern der Geheimnisse.");
    } finally {
      setSavingSecrets(false);
    }
  };

  const handleSaveCheckResults = async () => {
    setSavingChecks(true);
    try {
      await updateNPC(npc.id, { check_results: checkResults });
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Speichern der Würfelergebnisse.");
    } finally {
      setSavingChecks(false);
    }
  };

  return (
    <div className="rounded-lg border border-hero-border bg-background-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-hero-border bg-black/40 p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {npc.image_url ? (
            <div className="space-y-1">
              <div className="relative h-40 w-28 md:h-48 md:w-32 rounded-xl overflow-hidden border-2 border-hero-border bg-hero-dark/70 shadow-lg">
                <Image
                  src={npc.image_url}
                  alt={npc.name}
                  fill
                  className="object-cover"
                />
              </div>
              <NpcPortraitAttribution
                isAiGenerated={npc.image_is_ai_generated}
                className="w-28 md:w-32"
              />
            </div>
          ) : (
            <div className="grid h-32 w-24 md:h-40 md:w-28 place-items-center rounded-xl bg-hero-dark/50 border-2 border-hero-border text-accent-gold shadow-lg">
              <User className="h-8 w-8" />
            </div>
          )}
          <div>
            <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant flex items-center gap-2">
              {npc.name}
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favPending}
                className="text-accent-gold hover:scale-110 transition-transform disabled:opacity-50"
                title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              >
                {favPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Star className={`h-5 w-5 ${isFavorite ? "fill-accent-gold" : ""}`} />
                )}
              </button>
            </h1>
            {(npc.role || npc.title) && (
              <p className="font-libre text-gray-400 mt-0.5">
                {[npc.title, npc.role].filter(Boolean).join(" · ")}
              </p>
            )}
            {npc.status && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-barlow uppercase bg-hero-dark text-gray-300">
                {STATUS_LABELS[npc.status] ?? npc.status}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isGM && (
            <button
              type="button"
              onClick={() => setPlayerView((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-hero-border px-2 py-1 text-xs font-barlow font-bold uppercase text-gray-300 hover:text-accent-gold hover:border-accent-gold/70"
            >
              {playerView ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              Ansicht: {playerView ? "Spieler" : "GM"}
            </button>
          )}
          <Link
            href={`/dashboard/worlds/${worldId}/npcs/${npc.id}/edit`}
            className="font-barlow font-bold text-xs uppercase text-hero-vibrant hover:text-white transition-colors"
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-0">
        {/* Main */}
        <div className="md:col-span-2 p-6 space-y-6">
          {npc.description && (
            <section>
              <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Beschreibung
              </h2>
              <SmartText
                text={npc.description}
                entities={entities}
                worldId={worldId}
                emptyMessage="Keine Beschreibung vorhanden."
                largeImages
              />
            </section>
          )}
          {npc.appearance && (
            <section>
              <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Aussehen
              </h2>
              <SmartText
                text={npc.appearance}
                entities={entities}
                worldId={worldId}
                emptyMessage="Kein Aussehen hinterlegt."
                largeImages
              />
            </section>
          )}
          {npc.personality_traits && (
            <section>
              <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Persönlichkeit
              </h2>
              <SmartText
                text={npc.personality_traits}
                entities={entities}
                worldId={worldId}
                emptyMessage="Keine Persönlichkeit hinterlegt."
                largeImages
              />
            </section>
          )}
          {npc.current_location?.name && (
            <section>
              <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Aufenthaltsort
              </h2>
              <p className="font-libre text-gray-200">{npc.current_location.name}</p>
            </section>
          )}
          {npc.factions?.name && (
            <section>
              <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Fraktion
              </h2>
              <p className="font-libre text-gray-200">
                {npc.factions.name}
              </p>
            </section>
          )}

          {/* Ergebnisse für Spielerproben (check_results) – GM nutzt sie bei Spielerwürfen, inline bearbeitbar */}
          {isGM && (
            <section>
              <CheckResultsEditor
                checkResults={checkResults}
                onChange={setCheckResults}
                isGM={true}
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCheckResults}
                  disabled={savingChecks}
                  className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-400 disabled:opacity-50"
                >
                  {savingChecks ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Speichere Proben...
                    </>
                  ) : (
                    <>
                      <Dice5 className="h-4 w-4" />
                      Proben speichern
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="border-t md:border-t-0 md:border-l border-hero-border p-6 space-y-6 bg-black/20">
          {/* Geheimnisse */}
          <section>
            <h2 className="font-barlow font-semibold text-accent-gold border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
              <ScrollText className="h-4 w-4" />
              Geheimnisse
            </h2>
            {(() => {
              const visibleSecrets = playerView ? secrets.filter((s) => s.is_revealed) : secrets;
              if (visibleSecrets.length === 0) {
                return (
                  <p className="font-libre text-sm text-gray-500">
                    {playerView
                      ? "In dieser Ansicht sind aktuell keine für Spieler freigegebenen Geheimnisse vorhanden."
                      : "Keine Geheimnisse."}
                  </p>
                );
              }
              return (
                <ul className="space-y-2">
                  {visibleSecrets.map((secret) => (
                    <li
                      key={secret.id}
                      className="flex items-center justify-between gap-2 rounded border border-hero-dark/50 p-2 bg-slate-900/50"
                    >
                      <div className="min-w-0">
                        <p className="font-barlow font-bold text-sm text-white truncate">
                          {secret.title || "Geheimnis"}
                        </p>
                        {secret.campaign_id && campaignNames[secret.campaign_id] && (
                          <p className="font-libre text-xs text-gray-500">
                            Kampagne: {campaignNames[secret.campaign_id]}
                          </p>
                        )}
                      </div>
                      {isGM && !playerView && secret.campaign_id && (
                        <button
                          type="button"
                          onClick={() => handleToggleSecretReveal(secret)}
                          disabled={togglingSecretId === secret.id}
                          className="shrink-0 p-1.5 rounded border border-hero-border text-gray-400 hover:text-accent-gold hover:border-accent-gold transition-colors disabled:opacity-50"
                          title={secret.is_revealed ? "Für Spieler verbergen" : "Für Spieler sichtbar schalten"}
                        >
                          {togglingSecretId === secret.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : secret.is_revealed ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </section>

          {/* Beziehungen (Relationship Wizard) */}
          <section>
            <h2 className="font-barlow font-semibold text-accent-gold border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Beziehungen
            </h2>
            {isGM && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setEditingRelationship(null); setWizardOpen(true); }}
                  className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Beziehung schmieden
                </button>
                {relationships.length > 0 ? (
                  <div className="space-y-2">
                    {relationships.map((rel) => (
                      <RelationshipCard
                        key={rel.id}
                        relationship={rel}
                        currentNpcId={npc.id}
                        onEdit={(r) => { setEditingRelationship(r); setWizardOpen(true); }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="font-libre text-xs text-gray-500">
                    Noch keine Beziehungen definiert.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Relationship Wizard Modal */}
          {wizardOpen && (
            <RelationshipWizard
              worldId={worldId}
              sourceNpc={{ id: npc.id, name: npc.name, image_url: npc.image_url }}
              existingRelationship={editingRelationship ?? undefined}
              onClose={() => { setWizardOpen(false); setEditingRelationship(null); }}
              onSuccess={() => { setWizardOpen(false); setEditingRelationship(null); }}
            />
          )}

          {/* Welt-Geheimnisse & GM-Notizen (ohne Kampagne) */}
          {isGM && !playerView && (
            <section>
              <h2 className="font-barlow font-semibold text-accent-gold border-b border-hero-border pb-2 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Welt-Geheimnisse & GM-Notizen
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-gray-400">
                    GM-Notizen (weltweit)
                  </label>
                  <textarea
                    value={gmNotes}
                    onChange={(e) => setGmNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-gold resize-none"
                    placeholder="Interne Notizen zu diesem NPC, unabhängig von Kampagnen."
                  />
                </div>
                <div>
                  <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-accent-blood">
                    Versteckte Agenda (weltweit)
                  </label>
                  <textarea
                    value={hiddenAgenda}
                    onChange={(e) => setHiddenAgenda(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-accent-blood/60 bg-slate-900/80 p-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-blood resize-none"
                    placeholder="Was will dieser NPC wirklich? Diese Info ist nur für dich als Spielleiter sichtbar."
                  />
                </div>
                <div>
                  <label className="block mb-1 font-barlow font-semibold text-xs uppercase text-accent-blood">
                    Wahre Natur (weltweit)
                  </label>
                  <textarea
                    value={trueNature}
                    onChange={(e) => setTrueNature(e.target.value)}
                    rows={3}
                    className="w-full rounded border border-accent-blood/60 bg-slate-900/80 p-2 font-libre text-sm text-gray-100 outline-none focus:border-accent-blood resize-none"
                    placeholder="Wie ist die wahre, interne Persönlichkeit dieses NPCs?"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSecrets}
                    disabled={savingSecrets}
                    className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {savingSecrets ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Speichere Geheimnisse...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Geheimnisse speichern
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
