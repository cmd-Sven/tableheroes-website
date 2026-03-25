"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Edit2, X, Plus, BookOpen, FolderTree, Loader2 } from "lucide-react";
import { LoreHeaderImageSlider } from "@/src/components/dashboard/campaigns/lore/LoreImageSlider";
import { SmartText } from "@/src/components/ui/SmartText";
import { useWorldEntities } from "@/src/hooks/useWorldEntities";
import { updateLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { normalizeImageDisplay } from "@/src/lib/image-display";
import { SUGGESTED_PARENT_TYPES, SUGGESTED_CHILD_TYPES, isLocationType } from "@/src/lib/lore-types";

type LoreData = {
  name: string;
  type: string;
  description: string | null;
  image_url: string | null;
  image_display?: unknown;
  gm_notes?: string | null;
  additional_images?: Array<{ url: string; description: string; display?: unknown }>;
  parent_id?: string | null;
};

type ChildEntry = { id: string; name: string; type: string; image_url: string | null };
type ParentOption = { id: string; name: string; type: string };
type NPC = { id: string; name: string; image_url: string | null; role: string | null; status: string | null };
type Faction = { id: string; name: string; type?: string; description?: string | null; image_url?: string | null };

type ReligionDetails = {
  interpretation: string | null;
  priest_title: string | null;
  cleric_title: string | null;
  paladin_title: string | null;
  order_notes: string | null;
  magic_relation: string | null;
  relics: string | null;
  holidays?: Array<{ date: string; name: string; description: string }>;
  important_figures?: Array<{ name: string; title: string; description: string }>;
} | null;

type DeityRelationshipView = {
  relation_type: string;
  target_id: string;
  target_name: string;
  target_epithet: string | null;
};

type DeityDetails = {
  epithet: string | null;
  symbol_description: string | null;
  symbol_image_url: string | null;
  domain: string | null;
  dark_side: string | null;
  relationships?: DeityRelationshipView[];
} | null;

type Props = {
  lore: LoreData;
  worldId: string;
  loreId: string;
  backHref: string;
  backLabel: string;
  isLocation?: boolean;
  parent?: { id: string; name: string; type?: string } | null;
  loreType?: string;
  childEntries?: ChildEntry[];
  locationNPCs?: { residents: NPC[]; guests: NPC[] };
  factionsByLocation?: Faction[];
  parentOptions?: ParentOption[];
  orphanedEntries?: ChildEntry[];
  religionDetails?: ReligionDetails;
  deityDetails?: DeityDetails;
  loreMetadata?: {
    cultureName?: string; cultureId?: string;
    linkedRaces?: Array<{ id: string; name: string }>;
    linkedLanguages?: Array<{ id: string; name: string }>;
    linkedReligions?: Array<{ id: string; name: string }>;
    raceSubtypes?: string | null;
    raceTraits?: string | null;
    spokenByCultures?: Array<{ id: string; name: string }>;
    spokenByRaces?: Array<{ id: string; name: string }>;
  };
};

export function WorldLoreDetailClient({
  lore,
  worldId,
  loreId,
  backHref,
  backLabel,
  isLocation = false,
  parent = null,
  loreType = lore.type,
  childEntries = [],
  locationNPCs = { residents: [], guests: [] },
  factionsByLocation = [],
  parentOptions = [],
  orphanedEntries = [],
  religionDetails = null,
  deityDetails = null,
  loreMetadata = {},
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showParentSelect, setShowParentSelect] = useState(false);
  const [showChildSelect, setShowChildSelect] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedOrphanId, setSelectedOrphanId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; description: string; index: number } | null>(null);

  const { entities } = useWorldEntities(worldId);
  const suggestedParents = SUGGESTED_PARENT_TYPES[lore.type] ?? [];
  const suggestedChildren = SUGGESTED_CHILD_TYPES[lore.type] ?? [];
  const storiesAndLegends = childEntries.filter((c) => c.type === "Geschichten & Legenden");
  const locationChildren = childEntries.filter((c) => c.type !== "Geschichten & Legenden" && isLocationType(c.type));
  const canHaveParent = suggestedParents.length > 0;
  const canHaveChildren = suggestedChildren.length > 0;

  const handleLinkParent = () => {
    if (!selectedParentId) return;
    startTransition(async () => {
      try {
        await updateLoreEntry(loreId, { parent_id: selectedParentId });
        router.refresh();
        setShowParentSelect(false);
        setSelectedParentId(null);
      } catch (e: any) {
        alert(e?.message ?? "Fehler beim Verknüpfen.");
      }
    });
  };

  const handleLinkChild = () => {
    if (!selectedOrphanId) return;
    startTransition(async () => {
      try {
        await updateLoreEntry(selectedOrphanId, { parent_id: loreId });
        router.refresh();
        setShowChildSelect(false);
        setSelectedOrphanId(null);
      } catch (e: any) {
        alert(e?.message ?? "Fehler beim Verknüpfen.");
      }
    });
  };

  const handleUnlinkChild = (childId: string) => {
    if (!confirm("Ort entkoppeln? Er wird wieder zu einem Root-Element.")) return;
    startTransition(async () => {
      try {
        await updateLoreEntry(childId, { parent_id: null });
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Fehler beim Entkoppeln.");
      }
    });
  };

  const handleUnlinkParent = () => {
    if (!confirm("Ort vom übergeordneten Ort trennen?")) return;
    startTransition(async () => {
      try {
        await updateLoreEntry(loreId, { parent_id: null });
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "Fehler beim Trennen.");
      }
    });
  };

  const baseDisplay = normalizeImageDisplay(lore.image_display);
  const allImages = [
    ...(lore.image_url ? [{ url: lore.image_url, description: lore.name, display: baseDisplay }] : []),
    ...(lore.additional_images || []).map((img) => ({
      url: img.url,
      description: img.description,
      display: normalizeImageDisplay(img.display ?? baseDisplay),
    })),
  ].filter((img) => img.url?.trim());

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <Link
          href={`/dashboard/worlds/${worldId}/lore/${loreId}/edit`}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
        >
          <Edit2 className="h-4 w-4" />
          Bearbeiten
        </Link>
      </div>

      <div className="rounded-lg border border-hero-dark bg-background-card overflow-hidden">
        {/* Header-Bild: mittig oben, min 400px auf Desktop */}
        {allImages.length > 0 && (
          <div className="relative w-full min-h-[250px] lg:min-h-[400px] overflow-hidden">
            <LoreHeaderImageSlider images={allImages} />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-5 w-5 text-accent-gold" />
            <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark/50 text-hero-vibrant">
              {lore.type}
            </span>
          </div>
          <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant mb-4">
            {lore.name}
          </h1>
          {/* Gottheits-Details (World View) */}
          {lore.type === "Gottheit" && deityDetails && (
            <div className="mb-4 space-y-3">
              {deityDetails.symbol_image_url && (
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border border-hero-border bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deityDetails.symbol_image_url}
                      alt={`Symbol / Wappen von ${lore.name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {deityDetails.symbol_description && (
                    <p className="font-libre text-sm text-gray-200 leading-relaxed">
                      {deityDetails.symbol_description}
                    </p>
                  )}
                </div>
              )}
              {deityDetails.epithet && (
                <div>
                  <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                    Beiname / Epitheton
                  </h3>
                  <p className="font-libre text-sm text-gray-200 leading-relaxed">
                    {deityDetails.epithet}
                  </p>
                </div>
              )}
              {(deityDetails.domain || deityDetails.dark_side) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {deityDetails.domain && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Wofür steht die Gottheit?
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {deityDetails.domain}
                      </p>
                    </div>
                  )}
                  {deityDetails.dark_side && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Kehrseite / dunkle Facette
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {deityDetails.dark_side}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {deityDetails.symbol_description && !deityDetails.symbol_image_url && (
                <div>
                  <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                    Symbol / Wappen
                  </h4>
                  <p className="font-libre text-sm text-gray-200">
                    {deityDetails.symbol_description}
                  </p>
                </div>
              )}
              {Array.isArray(deityDetails.relationships) &&
                deityDetails.relationships.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                      Beziehungen zu anderen Gottheiten
                    </h3>
                    <ul className="space-y-1">
                      {deityDetails.relationships.map((r, idx) => {
                        const label =
                          r.relation_type === "child"
                            ? "Kind"
                            : r.relation_type === "father"
                            ? "Vater"
                            : r.relation_type === "mother"
                            ? "Mutter"
                            : r.relation_type === "kin"
                            ? "Verwandt"
                            : r.relation_type === "rival"
                            ? "Rivale"
                            : "Feind";
                        return (
                          <li
                            key={`${r.target_id}-${r.relation_type}-${idx}`}
                            className="font-libre text-sm text-gray-200"
                          >
                            <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">
                              {label}
                            </span>{" "}
                            zu{" "}
                            <span className="text-accent-gold">
                              {r.target_name}
                              {r.target_epithet
                                ? ` – ${r.target_epithet}`
                                : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
            </div>
          )}
          {/* Religion-Details (World View) */}
          {lore.type === "Religion" && religionDetails && (
            <div className="mb-4 space-y-3">
              {religionDetails.interpretation && (
                <div>
                  <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                    Interpretation der Gottheit
                  </h3>
                  <p className="font-libre text-sm text-gray-200 leading-relaxed">
                    {religionDetails.interpretation}
                  </p>
                </div>
              )}
              {(religionDetails.priest_title ||
                religionDetails.cleric_title ||
                religionDetails.paladin_title) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {religionDetails.priest_title && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Priesterbezeichnung
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.priest_title}
                      </p>
                    </div>
                  )}
                  {religionDetails.cleric_title && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Klerikerbezeichnung
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.cleric_title}
                      </p>
                    </div>
                  )}
                  {religionDetails.paladin_title && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Paladinbezeichnung
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.paladin_title}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {(religionDetails.order_notes ||
                religionDetails.magic_relation ||
                religionDetails.relics) && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {religionDetails.order_notes && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Ordnung der Religion
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.order_notes}
                      </p>
                    </div>
                  )}
                  {religionDetails.magic_relation && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Bezug zur Magie
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.magic_relation}
                      </p>
                    </div>
                  )}
                  {religionDetails.relics && (
                    <div>
                      <h4 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Wichtige Reliquien
                      </h4>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.relics}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {Array.isArray(religionDetails.holidays) &&
                religionDetails.holidays.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                      Besondere Feiertage
                    </h3>
                    <ul className="space-y-1">
                      {religionDetails.holidays.map((h, idx) => (
                        <li
                          key={`${h.name}-${idx}`}
                          className="font-libre text-sm text-gray-200"
                        >
                          <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">
                            {h.name}
                          </span>
                          {h.date && (
                            <span className="ml-2 text-[11px] text-gray-400">
                              ({h.date})
                            </span>
                          )}
                          {h.description && (
                            <span className="ml-1 text-gray-200">
                              – {h.description}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              {Array.isArray(religionDetails.important_figures) &&
                religionDetails.important_figures.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                      Wichtige Persönlichkeiten
                    </h3>
                    <div className="space-y-1">
                      {religionDetails.important_figures.map((p, idx) => (
                        <div
                          key={`${p.name}-${idx}`}
                          className="rounded border border-hero-border/60 bg-black/40 px-3 py-2"
                        >
                          <p className="font-libre text-sm text-gray-200">
                            <span className="font-barlow font-bold uppercase text-[11px] text-accent-gold">
                              {p.name}
                            </span>
                            {p.title && (
                              <span className="ml-2 text-[11px] text-gray-400">
                                – {p.title}
                              </span>
                            )}
                          </p>
                          {p.description && (
                            <p className="mt-1 font-libre text-xs text-gray-300">
                              {p.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {lore.description ? (
            <SmartText
              text={lore.description}
              entities={entities}
              worldId={worldId}
              emptyMessage="Keine Beschreibung."
            />
          ) : (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung.</p>
          )}
        </div>
      </div>

      {/* Structured Lore Metadata */}
      {lore.type === "Rasse" && (loreMetadata.cultureName || loreMetadata.raceSubtypes || loreMetadata.raceTraits || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0)) && (
        <div className="mt-6 rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
            Rassenprofil
          </h2>
          {loreMetadata.cultureName && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kultur</h3>
              <Link href={`/dashboard/worlds/${worldId}/lore/${loreMetadata.cultureId}`} className="font-libre text-hero-vibrant hover:text-accent-gold transition-colors underline underline-offset-2">
                {loreMetadata.cultureName}
              </Link>
            </div>
          )}
          {loreMetadata.raceSubtypes && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Unterarten / Subtypen</h3>
              <ul className="font-libre text-gray-200 space-y-1">
                {loreMetadata.raceSubtypes.split("\n").filter(Boolean).map((sub: string, i: number) => (
                  <li key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-gold shrink-0" />{sub.trim()}</li>
                ))}
              </ul>
            </div>
          )}
          {loreMetadata.raceTraits && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Besondere Merkmale</h3>
              <div className="font-libre text-gray-200 whitespace-pre-line leading-relaxed">{loreMetadata.raceTraits}</div>
            </div>
          )}
          {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Sprachen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedLanguages.map((lang: { id: string; name: string }) => (
                  <Link key={lang.id} href={`/dashboard/worlds/${worldId}/lore/${lang.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{lang.name}</Link>
                ))}
              </div>
            </div>
          )}
          {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Religionen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedReligions.map((rel: { id: string; name: string }) => (
                  <Link key={rel.id} href={`/dashboard/worlds/${worldId}/lore/${rel.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{rel.name}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lore.type === "Kultur" && ((loreMetadata.linkedRaces && loreMetadata.linkedRaces.length > 0) || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0) || (loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0)) && (
        <div className="mt-6 rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
            Kulturprofil
          </h2>
          {loreMetadata.linkedRaces && loreMetadata.linkedRaces.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Zugehörige Rassen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedRaces.map((race: { id: string; name: string }) => (
                  <Link key={race.id} href={`/dashboard/worlds/${worldId}/lore/${race.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{race.name}</Link>
                ))}
              </div>
            </div>
          )}
          {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Sprachen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedLanguages.map((lang: { id: string; name: string }) => (
                  <Link key={lang.id} href={`/dashboard/worlds/${worldId}/lore/${lang.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{lang.name}</Link>
                ))}
              </div>
            </div>
          )}
          {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Religionen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedReligions.map((rel: { id: string; name: string }) => (
                  <Link key={rel.id} href={`/dashboard/worlds/${worldId}/lore/${rel.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{rel.name}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lore.type === "Sprache" && ((loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0) || (loreMetadata.spokenByRaces && loreMetadata.spokenByRaces.length > 0)) && (
        <div className="mt-6 rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
            Sprachprofil
          </h2>
          {loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kulturen die diese Sprache sprechen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.spokenByCultures.map((c: { id: string; name: string }) => (
                  <Link key={c.id} href={`/dashboard/worlds/${worldId}/lore/${c.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{c.name}</Link>
                ))}
              </div>
            </div>
          )}
          {loreMetadata.spokenByRaces && loreMetadata.spokenByRaces.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Rassen die diese Sprache sprechen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.spokenByRaces.map((r: { id: string; name: string }) => (
                  <Link key={r.id} href={`/dashboard/worlds/${worldId}/lore/${r.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{r.name}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lore.type === "Religion" && loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0 && (
        <div className="mt-6 rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
            Verbreitung
          </h2>
          <div>
            <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kulturen mit diesem Glauben</h3>
            <div className="flex flex-wrap gap-2">
              {loreMetadata.spokenByCultures.map((c: { id: string; name: string }) => (
                <Link key={c.id} href={`/dashboard/worlds/${worldId}/lore/${c.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{c.name}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLocation && (loreMetadata.cultureName || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0) || (loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0)) && (
        <div className="mt-6 rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
            Ortsprofil
          </h2>
          {loreMetadata.cultureName && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Vorherrschende Kultur</h3>
              <Link href={`/dashboard/worlds/${worldId}/lore/${loreMetadata.cultureId}`} className="font-libre text-hero-vibrant hover:text-accent-gold transition-colors underline underline-offset-2">{loreMetadata.cultureName}</Link>
            </div>
          )}
          {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Gesprochene Sprachen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedLanguages.map((lang: { id: string; name: string }) => (
                  <Link key={lang.id} href={`/dashboard/worlds/${worldId}/lore/${lang.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{lang.name}</Link>
                ))}
              </div>
            </div>
          )}
          {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
            <div>
              <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Vorherrschende Religionen</h3>
              <div className="flex flex-wrap gap-2">
                {loreMetadata.linkedReligions.map((rel: { id: string; name: string }) => (
                  <Link key={rel.id} href={`/dashboard/worlds/${worldId}/lore/${rel.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{rel.name}</Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verknüpfter Ort (für Lore wie Geschichten & Legenden) */}
      {!isLocation && parent && parent.type && isLocationType(parent.type) && (
        <div className="mt-6 rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Verknüpfter Ort
          </h2>
          <Link
            href={"/dashboard/worlds/" + worldId + "/lore/" + parent.id}
            className="font-libre text-hero-vibrant hover:underline"
          >
            {parent.name}
            {parent.type && <span className="text-gray-500"> ({parent.type})</span>}
          </Link>
        </div>
      )}

      {/* GM-Sektionen für Orte */}
      {isLocation && (
        <div className="mt-6 space-y-6">
          {/* Parent verknüpfen / erstellen */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Übergeordneter Ort
            </h2>
            {parent ? (
              <div className="flex items-center justify-between gap-4">
                <Link
                  href={`/dashboard/worlds/${worldId}/lore/${parent.id}`}
                  className="font-libre text-hero-vibrant hover:underline"
                >
                  {parent.name}
                </Link>
                <button
                  type="button"
                  onClick={handleUnlinkParent}
                  disabled={isPending}
                  className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Trennen
                </button>
              </div>
            ) : canHaveParent ? (
              <>
                <p className="font-libre text-gray-400 text-sm mb-4">
                  {lore.type} kann unter {suggestedParents.join(", ")} liegen.
                </p>
                {!showParentSelect ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/worlds/${worldId}/locations/create?type=${encodeURIComponent(suggestedParents[0])}`}
                      className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark"
                    >
                      <Plus className="h-4 w-4" />
                      {suggestedParents[0]} erstellen
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowParentSelect(true)}
                      className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/30"
                    >
                      <FolderTree className="h-4 w-4" />
                      Mit bestehendem Ort verknüpfen
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      className="w-full bg-slate-900 border border-hero-dark rounded p-2 text-white"
                      value={selectedParentId ?? ""}
                      onChange={(e) => setSelectedParentId(e.target.value || null)}
                    >
                      <option value="">— Ort wählen —</option>
                      {parentOptions
                        .filter((p) => suggestedParents.includes(p.type))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.type})
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleLinkParent}
                        disabled={!selectedParentId || isPending}
                        className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white disabled:opacity-50"
                      >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderTree className="h-4 w-4" />}
                        Verknüpfen
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowParentSelect(false); setSelectedParentId(null); }}
                        className="rounded border border-hero-border px-4 py-2 text-sm"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="font-libre text-gray-500 italic">Kein übergeordneter Ort vorgesehen ({lore.type}).</p>
            )}
          </div>

          {/* Children / Unterorte verknüpfen / erstellen */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Untergeordnete Orte
            </h2>
            {canHaveChildren && (
              <>
                <p className="font-libre text-gray-400 text-sm mb-4">
                  {lore.type} kann enthalten: {suggestedChildren.slice(0, 6).join(", ")}
                  {suggestedChildren.length > 6 ? " …" : ""}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestedChildren.slice(0, 4).map((childType) => (
                    <Link
                      key={childType}
                      href={`/dashboard/worlds/${worldId}/locations/create?parentId=${loreId}&type=${childType}`}
                      className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-3 py-1.5 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-dark"
                    >
                      <Plus className="h-3 w-3" />
                      {childType} erstellen
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowChildSelect(true)}
                    className="inline-flex items-center gap-2 rounded border border-hero-border px-3 py-1.5 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:bg-hero-dark/30"
                  >
                    <FolderTree className="h-3 w-3" />
                    Verknüpfen
                  </button>
                </div>
              </>
            )}
            {showChildSelect && orphanedEntries.length > 0 && (
              <div className="space-y-2 border-t border-hero-border pt-4">
                <select
                  className="w-full bg-slate-900 border border-hero-dark rounded p-2 text-white"
                  value={selectedOrphanId ?? ""}
                  onChange={(e) => setSelectedOrphanId(e.target.value || null)}
                >
                  <option value="">— Ort wählen —</option>
                  {orphanedEntries
                    .filter((o) => canHaveChildren && suggestedChildren.includes(o.type) && o.type !== "Geschichten & Legenden")
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type})
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleLinkChild}
                    disabled={!selectedOrphanId || isPending}
                    className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Verknüpfen
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowChildSelect(false); setSelectedOrphanId(null); }}
                    className="rounded border border-hero-border px-4 py-2 text-sm"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            {locationChildren.length > 0 && (
              <ul className="mt-4 space-y-2">
                {locationChildren.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 border-b border-hero-dark/50 last:border-0">
                    <Link href={`/dashboard/worlds/${worldId}/lore/${c.id}`} className="font-libre text-hero-vibrant hover:underline">
                      {c.name}
                    </Link>
                    <span className="text-xs text-gray-500">{c.type}</span>
                    <button
                      type="button"
                      onClick={() => handleUnlinkChild(c.id)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Entkoppeln
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!canHaveChildren && locationChildren.length === 0 && (
              <p className="font-libre text-gray-500 italic">Keine Unterorte vorgesehen für {lore.type}.</p>
            )}
          </div>

          {/* Geschichten & Legenden */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Geschichten & Legenden
            </h2>
            {storiesAndLegends.length > 0 && (
              <ul className="mb-4 space-y-2">
                {storiesAndLegends.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={"/dashboard/worlds/" + worldId + "/lore/" + c.id}
                      className="font-libre text-hero-vibrant hover:underline"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/dashboard/worlds/${worldId}/lore/new?parentId=${loreId}&type=${encodeURIComponent("Geschichten & Legenden")}`}
              className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:bg-hero-dark/30"
            >
              <BookOpen className="h-4 w-4" />
              Eintrag erstellen
            </Link>
          </div>

          {/* NPCs */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              NPCs
            </h2>
            {(locationNPCs.residents.length > 0 || locationNPCs.guests.length > 0) ? (
              <div className="space-y-4">
                {locationNPCs.residents.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold mb-2">Ansässig</h3>
                    <ul className="space-y-1">
                      {locationNPCs.residents.map((npc) => (
                        <li key={npc.id}>
                          <Link
                            href={`/dashboard/worlds/${worldId}/npcs/${npc.id}`}
                            className="font-libre text-hero-vibrant hover:underline"
                          >
                            {npc.name}
                            {npc.role && <span className="text-gray-500"> ({npc.role})</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {locationNPCs.guests.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold mb-2">Gäste</h3>
                    <ul className="space-y-1">
                      {locationNPCs.guests.map((npc) => (
                        <li key={npc.id}>
                          <Link
                            href={`/dashboard/worlds/${worldId}/npcs/${npc.id}`}
                            className="font-libre text-hero-vibrant hover:underline"
                          >
                            {npc.name}
                            {npc.role && <span className="text-gray-500"> ({npc.role})</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href={"/dashboard/worlds/" + worldId + "/npcs/create?locationId=" + loreId}
                  className="inline-flex items-center gap-2 text-sm text-hero-vibrant hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  NPC hier platzieren
                </Link>
              </div>
            ) : (
              <>
                <p className="font-libre text-gray-500 italic mb-2">Keine NPCs mit diesem Ort verknüpft.</p>
                <Link
                  href={"/dashboard/worlds/" + worldId + "/npcs/create?locationId=" + loreId}
                  className="inline-flex items-center gap-2 text-sm text-hero-vibrant hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  NPC hinzufügen
                </Link>
              </>
            )}
          </div>

          {/* Fraktionen */}
          <div className="rounded-lg border border-hero-dark bg-background-card p-6">
            <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
              Fraktionen (Hauptsitz)
            </h2>
            {factionsByLocation.length > 0 ? (
              <ul className="space-y-2">
                {factionsByLocation.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/dashboard/worlds/${worldId}/factions/${f.id}`}
                      className="font-libre text-hero-vibrant hover:underline"
                    >
                      {f.name}
                      {f.type && <span className="text-gray-500"> ({f.type})</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-libre text-gray-500 italic">Keine Fraktionen mit Hauptsitz an diesem Ort.</p>
            )}
            <Link
              href={`/dashboard/worlds/${worldId}/factions/new?hqLocationId=${loreId}`}
              className="inline-flex items-center gap-2 mt-2 text-sm text-hero-vibrant hover:underline"
            >
              <Plus className="h-4 w-4" />
              Fraktion hinzufügen
            </Link>
          </div>
        </div>
      )}

      {/* Bildergalerie (alle zusätzlichen Bilder) */}
      {(lore.additional_images || []).length > 0 && (
        <div className="mt-6 rounded-lg border border-hero-dark bg-background-card p-6">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Bildergalerie
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(lore.additional_images || []).map((img, index) => (
              <button
                key={index}
                type="button"
                className="group relative rounded-lg border border-hero-border overflow-hidden bg-hero-dark/30 text-left cursor-pointer hover:border-hero-vibrant transition-all"
                onClick={() => setLightboxImage({ url: img.url, description: img.description, index })}
              >
                <div className="relative w-full aspect-video">
                  <Image
                    src={img.url}
                    alt={img.description || `Bild ${index + 1}`}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                {img.description && (
                  <div className="p-3">
                    <p className="font-libre text-sm text-gray-300">{img.description}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (lore.additional_images || []).length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
            title="Schließen (ESC)"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImage.url}
              alt={lightboxImage.description || `Bild ${lightboxImage.index + 1}`}
              width={1920}
              height={1080}
              className="object-contain max-w-full max-h-[90vh] rounded-lg"
            />
            {lightboxImage.description && (
              <p className="font-libre text-lg text-white text-center mt-4">{lightboxImage.description}</p>
            )}
            {(lore.additional_images || []).length > 1 && (
              <p className="font-barlow text-sm text-gray-400 text-center mt-2">
                Bild {lightboxImage.index + 1} von {(lore.additional_images || []).length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
