"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SecretsManager } from "@/src/components/dashboard/campaigns/secrets/SecretsManager";
import { UniversalSecretModal } from "@/src/components/dashboard/campaigns/secrets/UniversalSecretModal";
import { NPCCarousel } from "@/src/components/dashboard/campaigns/npcs/NPCCarousel";
import { LoreHierarchyManager } from "./LoreHierarchyManager";
import { LoreHeader } from "./LoreHeader";
import { LoreDescription } from "./LoreDescription";
import { LoreGallery } from "./LoreGallery";
import { LoreGMNotes } from "./LoreGMNotes";
import { isLocationType } from "@/src/lib/lore-types";
import { NpcSceneAppearances } from "@/src/components/dashboard/campaigns/npcs/NpcSceneAppearances";
import type { SceneMediaAppearance } from "@/src/lib/scene-media-types";

type LoreEntry = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  image_url: string | null;
  image_display?: unknown;
  additional_images?: Array<{ url: string; description: string; display?: unknown }> | null;
  gm_notes: string | null;
  is_revealed: boolean;
  parent_id: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
};

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

type LocationNPCs = {
  residents: Array<{ id: string; name: string; image_url: string | null; role: string | null; status: string | null }>;
  guests: Array<{ id: string; name: string; image_url: string | null; role: string | null; status: string | null }>;
};

type LoreLink = { id: string; name: string };

type LoreMetadata = {
  cultureName?: string;
  cultureId?: string;
  linkedRaces?: LoreLink[];
  linkedLanguages?: LoreLink[];
  linkedReligions?: LoreLink[];
  raceSubtypes?: string | null;
  raceTraits?: string | null;
  spokenByCultures?: LoreLink[];
  spokenByRaces?: LoreLink[];
};

type ReligionDeityLoreLink = {
  loreId: string | null;
  name: string;
  epithet: string | null;
} | null;

type Props = {
  lore: LoreEntry;
  campaignId: string;
  isGM: boolean;
  locationNPCs?: LocationNPCs | null;
  sceneAppearances?: SceneMediaAppearance[];
  childEntries?: Array<{ id: string; name: string; type: string; image_url: string | null; is_revealed: boolean; created_at?: string; is_favorite?: boolean; published_at?: string; latest_secret_discovered_at?: string | null; has_recent_secret?: boolean }>;
  breadcrumb?: Array<{ id: string; name: string; type: string }>;
  parentOptions?: Array<{ id: string; name: string; type: string }>;
  orphanedEntries?: Array<{ id: string; name: string; type: string; image_url: string | null }>;
  religionDetails?: ReligionDetails;
  religionDeityLore?: ReligionDeityLoreLink;
  deityDetails?: DeityDetails;
  loreMetadata?: LoreMetadata;
};

export function LoreDetailPage({ 
  lore: initialLore, 
  campaignId, 
  isGM, 
  locationNPCs = { residents: [], guests: [] },
  sceneAppearances = [],
  childEntries = [],
  breadcrumb = [],
  parentOptions = [],
  orphanedEntries = [],
  religionDetails = null,
  religionDeityLore = null,
  deityDetails = null,
  loreMetadata = {},
}: Props) {
  const router = useRouter();
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretsRefreshKey, setSecretsRefreshKey] = useState(0);

  // Safe check: Ensure lore exists
  if (!initialLore || !initialLore.name) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Lore-Eintrag nicht gefunden</h2>
        <p className="text-gray-400 mb-4">Dieser Eintrag existiert nicht oder wurde gelöscht.</p>
        <a
          href={`/dashboard/campaigns/${campaignId}?tab=lore`}
          className="text-hero-vibrant hover:underline mt-4 inline-block"
        >
          &larr; Zurück zur Übersicht
        </a>
      </div>
    );
  }
  
  // Parse additional_images if it's a string (from database)
  const parseAdditionalImages = (images: any): Array<{ url: string; description: string }> | null => {
    if (!images) return null;
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch {
        return null;
      }
    }
    if (Array.isArray(images)) return images;
    return null;
  };
  
  const lore = {
    ...initialLore,
    additional_images: parseAdditionalImages(initialLore.additional_images),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LoreHeader
        lore={lore}
        campaignId={campaignId}
        isGM={isGM}
        breadcrumb={breadcrumb}
        parentOptions={parentOptions}
      />

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gottheits-Details */}
          {lore.type === "Gottheit" && deityDetails && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Göttliches Profil
              </h2>

              {/* Symbol-Bild (falls vorhanden) */}
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

              {/* Epitheton */}
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

              {/* Domäne & Kehrseite */}
              {(deityDetails.domain || deityDetails.dark_side) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {deityDetails.domain && (
                    <div>
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Wofür steht die Gottheit?
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {deityDetails.domain}
                      </p>
                    </div>
                  )}
                  {deityDetails.dark_side && (
                    <div>
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Kehrseite / dunkle Facette
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {deityDetails.dark_side}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Symbol-Beschreibung (Fallback, falls kein Bild gesetzt ist) */}
              {deityDetails.symbol_description && !deityDetails.symbol_image_url && (
                <div>
                  <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                    Symbol / Wappen
                  </h3>
                  <p className="font-libre text-sm text-gray-200">
                    {deityDetails.symbol_description}
                  </p>
                </div>
              )}

              {/* Göttliche Beziehungen */}
              {Array.isArray(deityDetails.relationships) &&
                deityDetails.relationships.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-2">
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

          {/* Religion-Details */}
          {lore.type === "Religion" && (religionDetails || religionDeityLore) && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Glaubensprofil
              </h2>

              {religionDeityLore && (
                <div>
                  <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">Gottheit</h3>
                  <p className="font-libre text-sm text-gray-200 leading-relaxed">
                    {religionDeityLore.loreId ? (
                      <Link
                        href={`/dashboard/campaigns/${campaignId}/lore/${religionDeityLore.loreId}`}
                        className="text-hero-vibrant hover:underline"
                      >
                        {religionDeityLore.name}
                      </Link>
                    ) : (
                      <span className="text-gray-200">{religionDeityLore.name}</span>
                    )}
                    {religionDeityLore.epithet ? (
                      <span className="text-gray-300"> – {religionDeityLore.epithet}</span>
                    ) : null}
                  </p>
                </div>
              )}

              {/* Interpretation */}
              {religionDetails?.interpretation && (
                <div>
                  <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-1">
                    Interpretation der Gottheit
                  </h3>
                  <p className="font-libre text-sm text-gray-200 leading-relaxed">
                    {religionDetails.interpretation}
                  </p>
                </div>
              )}

              {/* Rollen / Titel */}
              {(religionDetails?.priest_title ||
                religionDetails?.cleric_title ||
                religionDetails?.paladin_title) && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {religionDetails?.priest_title && (
                    <div>
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Priesterbezeichnung
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.priest_title}
                      </p>
                    </div>
                  )}
                  {religionDetails?.cleric_title && (
                    <div>
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Klerikerbezeichnung
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.cleric_title}
                      </p>
                    </div>
                  )}
                  {religionDetails?.paladin_title && (
                    <div>
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Paladinbezeichnung
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.paladin_title}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Ordnung / Magie / Reliquien */}
              {(religionDetails?.order_notes ||
                religionDetails?.magic_relation ||
                religionDetails?.relics) && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {religionDetails?.order_notes && (
                    <div className="sm:col-span-1">
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Ordnung der Religion
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.order_notes}
                      </p>
                    </div>
                  )}
                  {religionDetails?.magic_relation && (
                    <div className="sm:col-span-1">
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Bezug zur Magie
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.magic_relation}
                      </p>
                    </div>
                  )}
                  {religionDetails?.relics && (
                    <div className="sm:col-span-1">
                      <h3 className="font-barlow font-bold text-[11px] uppercase text-gray-400 mb-1">
                        Wichtige Reliquien
                      </h3>
                      <p className="font-libre text-sm text-gray-200">
                        {religionDetails.relics}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Feiertage */}
              {religionDetails?.holidays &&
                religionDetails.holidays.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-2">
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

              {/* Wichtige Persönlichkeiten */}
              {religionDetails?.important_figures &&
                religionDetails.important_figures.length > 0 && (
                  <div>
                    <h3 className="font-cinzel font-bold text-accent-gold text-sm mb-2">
                      Wichtige Persönlichkeiten
                    </h3>
                    <div className="space-y-2">
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

          {/* Description */}
          <LoreDescription lore={lore} campaignId={campaignId} isGM={isGM} />

          {/* Structured Lore Metadata */}
          {lore.type === "Rasse" && (loreMetadata.cultureName || loreMetadata.raceSubtypes || loreMetadata.raceTraits || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0)) && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Rassenprofil
              </h2>

              {loreMetadata.cultureName && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kultur</h3>
                  <a
                    href={`/dashboard/campaigns/${campaignId}/lore/${loreMetadata.cultureId}`}
                    className="font-libre text-hero-vibrant hover:text-accent-gold transition-colors underline underline-offset-2"
                  >
                    {loreMetadata.cultureName}
                  </a>
                </div>
              )}

              {loreMetadata.raceSubtypes && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Unterarten / Subtypen</h3>
                  <ul className="font-libre text-gray-200 space-y-1">
                    {loreMetadata.raceSubtypes.split("\n").filter(Boolean).map((sub, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-gold shrink-0" />
                        {sub.trim()}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {loreMetadata.raceTraits && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Besondere Merkmale</h3>
                  <div className="font-libre text-gray-200 whitespace-pre-line leading-relaxed">
                    {loreMetadata.raceTraits}
                  </div>
                </div>
              )}

              {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Sprachen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedLanguages.map((lang) => (
                      <a
                        key={lang.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${lang.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {lang.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Religionen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedReligions.map((rel) => (
                      <a
                        key={rel.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${rel.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {rel.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {lore.type === "Kultur" && ((loreMetadata.linkedRaces && loreMetadata.linkedRaces.length > 0) || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0) || (loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0)) && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Kulturprofil
              </h2>

              {loreMetadata.linkedRaces && loreMetadata.linkedRaces.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Zugehörige Rassen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedRaces.map((race) => (
                      <a
                        key={race.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${race.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {race.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Sprachen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedLanguages.map((lang) => (
                      <a
                        key={lang.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${lang.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {lang.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Religionen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedReligions.map((rel) => (
                      <a
                        key={rel.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${rel.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {rel.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {lore.type === "Sprache" && ((loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0) || (loreMetadata.spokenByRaces && loreMetadata.spokenByRaces.length > 0)) && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Sprachprofil
              </h2>

              {loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kulturen die diese Sprache sprechen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.spokenByCultures.map((c) => (
                      <a
                        key={c.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${c.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {c.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {loreMetadata.spokenByRaces && loreMetadata.spokenByRaces.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Rassen die diese Sprache sprechen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.spokenByRaces.map((r) => (
                      <a
                        key={r.id}
                        href={`/dashboard/campaigns/${campaignId}/lore/${r.id}`}
                        className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                      >
                        {r.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {lore.type === "Religion" && loreMetadata.spokenByCultures && loreMetadata.spokenByCultures.length > 0 && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Verbreitung
              </h2>
              <div>
                <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Kulturen mit diesem Glauben</h3>
                <div className="flex flex-wrap gap-2">
                  {loreMetadata.spokenByCultures.map((c) => (
                    <a
                      key={c.id}
                      href={`/dashboard/campaigns/${campaignId}/lore/${c.id}`}
                      className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors"
                    >
                      {c.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLocationType(lore.type) && (loreMetadata.cultureName || (loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0) || (loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0)) && (
            <div className="rounded-lg border border-hero-border bg-background-card p-6 space-y-4">
              <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-1">
                Ortsprofil
              </h2>
              {loreMetadata.cultureName && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Vorherrschende Kultur</h3>
                  <a href={`/dashboard/campaigns/${campaignId}/lore/${loreMetadata.cultureId}`} className="font-libre text-hero-vibrant hover:text-accent-gold transition-colors underline underline-offset-2">{loreMetadata.cultureName}</a>
                </div>
              )}
              {loreMetadata.linkedLanguages && loreMetadata.linkedLanguages.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Gesprochene Sprachen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedLanguages.map((lang) => (
                      <a key={lang.id} href={`/dashboard/campaigns/${campaignId}/lore/${lang.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{lang.name}</a>
                    ))}
                  </div>
                </div>
              )}
              {loreMetadata.linkedReligions && loreMetadata.linkedReligions.length > 0 && (
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-accent-gold mb-1">Vorherrschende Religionen</h3>
                  <div className="flex flex-wrap gap-2">
                    {loreMetadata.linkedReligions.map((rel) => (
                      <a key={rel.id} href={`/dashboard/campaigns/${campaignId}/lore/${rel.id}`} className="rounded-full border border-hero-border bg-hero-dark/50 px-3 py-1 font-libre text-sm text-gray-200 hover:border-accent-gold hover:text-accent-gold transition-colors">{rel.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hierarchie-Sektion */}
          <LoreHierarchyManager 
            lore={lore} 
            childEntries={childEntries} 
            isGM={isGM} 
            campaignId={campaignId} 
            orphanedEntries={orphanedEntries}
          />

          {/* Image Gallery */}
          <LoreGallery lore={lore} isGM={isGM} />

          {/* Secrets Manager */}
          <div 
            className="rounded-lg p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.8)] transition-shadow duration-300"
            style={{
              border: "3px solid #B8860B",
              backgroundImage: "url('/images/dark-wood.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="relative z-10">
              {isGM && (
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsSecretModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded border border-accent-gold/60 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-xs uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    ✨ Plot-Geheimnis mit KI weben
                  </button>
                </div>
              )}
              <SecretsManager
                entityId={lore.id}
                entityType="lore"
                campaignId={campaignId}
                isGM={isGM}
                refreshKey={secretsRefreshKey}
              />
            </div>
          </div>
        </div>

        {/* Sidebar - GM Notes */}
        <LoreGMNotes lore={lore} isGM={isGM} />
      </div>

      {/* Bewohner-Sektion */}
      {(locationNPCs?.residents?.length ?? 0) > 0 && (
        <NPCCarousel residents={locationNPCs?.residents || []} isGM={isGM} campaignId={campaignId} title="Bewohner & Ansässige" />
      )}
      {(locationNPCs?.guests?.length ?? 0) > 0 && (
        <NPCCarousel residents={locationNPCs?.guests || []} isGM={isGM} campaignId={campaignId} title="Aktuelle Gäste" />
      )}

      {isLocationType(lore.type) && sceneAppearances.length > 0 && (
        <NpcSceneAppearances
          campaignId={campaignId}
          appearances={sceneAppearances}
          title="Szenen an diesem Ort"
          description="Diese Szenenbilder wurden gezeigt, während dieser Ort auf der Live-Bühne aktiv war."
          showLocation={false}
        />
      )}

      {/* Universal Secret AI Modal */}
      {isGM && (
        <UniversalSecretModal
          entityId={lore.id}
          entityType="lore"
          campaignId={campaignId}
          entityName={lore.name}
          isOpen={isSecretModalOpen}
          onClose={() => setIsSecretModalOpen(false)}
          onCreated={() => {
            // Trigger refresh der Secrets-Liste
            setSecretsRefreshKey((prev) => prev + 1);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
