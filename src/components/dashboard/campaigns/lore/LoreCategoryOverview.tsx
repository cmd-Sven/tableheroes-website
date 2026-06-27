"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { toggleLoreFavorite } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { isLocationType } from "@/src/lib/lore-types";
import {
  buildLoreOverviewSections,
  countLoreOverviewItems,
  countLoreOverviewNewItems,
  isLoreOverviewItemNew,
  isLoreOverviewItemUpdate,
  type BuildLoreOverviewOptions,
  type LoreOverviewItem,
  type LoreOverviewLocationNode,
  type LoreOverviewSection,
  type LoreOverviewSourceEntry,
} from "@/src/lib/lore-overview";

type Props = {
  entries: LoreOverviewSourceEntry[];
  worldId?: string;
  campaignId?: string;
  searchQuery?: string;
  scope?: BuildLoreOverviewOptions["scope"];
  /** Favoriten-Stern und Neu/Update-Badges (Kampagnen-Spieleransicht) */
  showPlayerFeatures?: boolean;
  /** Nur freigegebene Einträge (campaign_visibility) – für Spieler in Kampagnen */
  onlyRevealed?: boolean;
};

function matchesSearch(entry: LoreOverviewSourceEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    entry.name.toLowerCase().includes(q) ||
    entry.type.toLowerCase().includes(q) ||
    (entry.description ?? "").toLowerCase().includes(q)
  );
}

function filterEntriesForOverview(
  entries: LoreOverviewSourceEntry[],
  searchQuery: string,
  allowedIds: Set<string>,
): LoreOverviewSourceEntry[] {
  const visibleEntries = entries.filter((entry) => allowedIds.has(entry.id));
  const q = searchQuery.trim().toLowerCase();
  if (!q) return visibleEntries;

  const byId = new Map(visibleEntries.map((entry) => [entry.id, entry]));
  const directHits = new Set(
    visibleEntries.filter((entry) => matchesSearch(entry, q)).map((entry) => entry.id),
  );

  for (const entry of visibleEntries) {
    if (entry.type !== "Rasse" || !directHits.has(entry.id)) continue;
    const cultureId = entry.culture_id?.trim();
    if (cultureId && allowedIds.has(cultureId)) directHits.add(cultureId);
  }
  for (const culture of visibleEntries.filter((e) => e.type === "Kultur")) {
    if (!directHits.has(culture.id)) continue;
    for (const raceId of culture.race_ids ?? []) {
      const id = raceId?.trim();
      if (id && allowedIds.has(id)) directHits.add(id);
    }
  }

  const locationEntries = visibleEntries.filter((entry) => isLocationType(entry.type));

  for (const entry of locationEntries) {
    if (!directHits.has(entry.id)) continue;
    let parentId = entry.parent_id?.trim() || null;
    while (parentId && byId.has(parentId) && allowedIds.has(parentId)) {
      directHits.add(parentId);
      parentId = byId.get(parentId)?.parent_id?.trim() || null;
    }
  }

  const addDescendants = (parentId: string) => {
    for (const entry of locationEntries) {
      if (entry.parent_id === parentId && !directHits.has(entry.id) && allowedIds.has(entry.id)) {
        directHits.add(entry.id);
        addDescendants(entry.id);
      }
    }
  };

  for (const id of [...directHits]) {
    const entry = byId.get(id);
    if (entry && isLocationType(entry.type)) {
      addDescendants(id);
    }
  }

  return visibleEntries.filter((entry) => directHits.has(entry.id));
}

function resolveDetailHref(
  item: LoreOverviewItem,
  worldId?: string,
  campaignId?: string,
): string {
  if (campaignId) {
    return `/dashboard/campaigns/${campaignId}/lore/${item.id}`;
  }
  if (isLocationType(item.type) && worldId) {
    return `/dashboard/worlds/${worldId}/locations/${item.id}`;
  }
  return `/dashboard/worlds/${worldId}/lore/${item.id}`;
}

function OverviewEntryRow({
  item,
  worldId,
  campaignId,
  href,
  subtle = false,
  showPlayerFeatures = false,
  isFavorite,
  onToggleFavorite,
  isFavoritePending = false,
}: {
  item: LoreOverviewItem;
  worldId?: string;
  campaignId?: string;
  href?: string;
  subtle?: boolean;
  showPlayerFeatures?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (item: LoreOverviewItem) => void;
  isFavoritePending?: boolean;
}) {
  const isNew = isLoreOverviewItemNew(item);
  const isUpdate = isLoreOverviewItemUpdate(item);

  return (
    <div
      className={`flex items-center gap-2 rounded px-1 py-0.5 ${
        isNew ? "bg-green-500/10" : isUpdate ? "bg-blue-500/10" : ""
      }`}
    >
      <Link
        href={href ?? resolveDetailHref(item, worldId, campaignId)}
        className={`group min-w-0 flex-1 flex items-baseline justify-between gap-3 rounded px-1 py-1 transition-colors hover:bg-hero-dark/50 ${
          subtle ? "text-gray-300" : "text-white"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-libre group-hover:text-hero-vibrant">{item.name}</span>
          {showPlayerFeatures && isNew ? (
            <span className="shrink-0 rounded bg-green-500 px-1.5 py-0.5 font-barlow text-[10px] font-bold uppercase text-white">
              Neu
            </span>
          ) : null}
          {showPlayerFeatures && isUpdate ? (
            <span className="shrink-0 rounded bg-blue-500 px-1.5 py-0.5 font-barlow text-[10px] font-bold uppercase text-white">
              Update
            </span>
          ) : null}
        </span>
        <span className="shrink-0 font-barlow text-[10px] font-bold uppercase text-gray-500">
          {item.type}
        </span>
      </Link>
      {showPlayerFeatures && onToggleFavorite ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite(item);
          }}
          disabled={isFavoritePending}
          className={`shrink-0 rounded p-1.5 transition-colors disabled:opacity-50 ${
            isFavorite
              ? "text-yellow-500 hover:bg-yellow-500/20"
              : "text-gray-500 hover:bg-hero-dark/60 hover:text-yellow-500"
          }`}
          title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
        >
          <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}

function LocationTreeList({
  nodes,
  worldId,
  campaignId,
  depth = 0,
  showPlayerFeatures,
  favoriteStates,
  onToggleFavorite,
  isFavoritePending,
}: {
  nodes: LoreOverviewLocationNode[];
  worldId?: string;
  campaignId?: string;
  depth?: number;
  showPlayerFeatures?: boolean;
  favoriteStates: Record<string, boolean>;
  onToggleFavorite?: (item: LoreOverviewItem) => void;
  isFavoritePending?: boolean;
}) {
  return (
    <ul
      className={
        depth > 0
          ? "mt-1 space-y-0.5 border-l border-hero-border/40 ml-3 pl-2"
          : "space-y-1"
      }
    >
      {nodes.map((node) => (
        <li key={node.item.id}>
          <OverviewEntryRow
            item={node.item}
            worldId={worldId}
            campaignId={campaignId}
            subtle={depth > 0}
            showPlayerFeatures={showPlayerFeatures}
            isFavorite={favoriteStates[node.item.id] === true}
            onToggleFavorite={onToggleFavorite}
            isFavoritePending={isFavoritePending}
          />
          {node.children.length > 0 ? (
            <LocationTreeList
              nodes={node.children}
              worldId={worldId}
              campaignId={campaignId}
              depth={depth + 1}
              showPlayerFeatures={showPlayerFeatures}
              favoriteStates={favoriteStates}
              onToggleFavorite={onToggleFavorite}
              isFavoritePending={isFavoritePending}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function OverviewSection({
  section,
  worldId,
  campaignId,
  isExpanded,
  onToggle,
  showPlayerFeatures,
  favoriteStates,
  onToggleFavorite,
  isFavoritePending,
}: {
  section: LoreOverviewSection;
  worldId?: string;
  campaignId?: string;
  isExpanded: boolean;
  onToggle: () => void;
  showPlayerFeatures?: boolean;
  favoriteStates: Record<string, boolean>;
  onToggleFavorite?: (item: LoreOverviewItem) => void;
  isFavoritePending?: boolean;
}) {
  const count = countLoreOverviewItems(section);
  const newCount = showPlayerFeatures ? countLoreOverviewNewItems(section) : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-hero-dark bg-hero-dark/20">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-barlow font-bold uppercase text-hero-vibrant transition-colors hover:bg-hero-dark/40"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {section.label}
        </span>
        <span className="flex items-center gap-2">
          {newCount > 0 ? (
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 font-barlow text-[10px] font-bold uppercase text-green-300">
              {newCount} neu
            </span>
          ) : null}
          <span className="rounded-full bg-hero-dark px-2 py-0.5 font-barlow text-xs text-gray-400">
            {count}
          </span>
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-hero-dark/50 px-4 py-3">
          {section.locationTree && section.locationTree.length > 0 ? (
            <LocationTreeList
              nodes={section.locationTree}
              worldId={worldId}
              campaignId={campaignId}
              showPlayerFeatures={showPlayerFeatures}
              favoriteStates={favoriteStates}
              onToggleFavorite={onToggleFavorite}
              isFavoritePending={isFavoritePending}
            />
          ) : null}

          {section.cultureGroups && section.cultureGroups.length > 0 ? (
            <ul className="space-y-3">
              {section.cultureGroups.map((group) => (
                <li key={group.culture.id}>
                  <OverviewEntryRow
                    item={group.culture}
                    worldId={worldId}
                    campaignId={campaignId}
                    showPlayerFeatures={showPlayerFeatures}
                    isFavorite={favoriteStates[group.culture.id] === true}
                    onToggleFavorite={onToggleFavorite}
                    isFavoritePending={isFavoritePending}
                  />
                  {group.races.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 border-l border-hero-border/40 ml-3 pl-2">
                      {group.races.map((race) => (
                        <li key={race.id}>
                          <OverviewEntryRow
                            item={race}
                            worldId={worldId}
                            campaignId={campaignId}
                            subtle
                            showPlayerFeatures={showPlayerFeatures}
                            isFavorite={favoriteStates[race.id] === true}
                            onToggleFavorite={onToggleFavorite}
                            isFavoritePending={isFavoritePending}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {section.orphanRaces && section.orphanRaces.length > 0 ? (
            <div
              className={
                section.cultureGroups?.length ? "mt-4 pt-3 border-t border-hero-dark/40" : undefined
              }
            >
              <p className="mb-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                Rassen ohne Kultur
              </p>
              <ul className="space-y-0.5">
                {section.orphanRaces.map((race) => (
                  <li key={race.id}>
                    <OverviewEntryRow
                      item={race}
                      worldId={worldId}
                      campaignId={campaignId}
                      subtle
                      showPlayerFeatures={showPlayerFeatures}
                      isFavorite={favoriteStates[race.id] === true}
                      onToggleFavorite={onToggleFavorite}
                      isFavoritePending={isFavoritePending}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.entries.length > 0 ? (
            <ul className="space-y-0.5">
              {section.entries.map((entry) => (
                <li key={entry.id}>
                  <OverviewEntryRow
                    item={entry}
                    worldId={worldId}
                    campaignId={campaignId}
                    showPlayerFeatures={showPlayerFeatures}
                    isFavorite={favoriteStates[entry.id] === true}
                    onToggleFavorite={onToggleFavorite}
                    isFavoritePending={isFavoritePending}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LoreCategoryOverview({
  entries,
  worldId,
  campaignId,
  searchQuery = "",
  scope = "all",
  showPlayerFeatures = false,
  onlyRevealed = false,
}: Props) {
  const [isFavoritePending, startFavoriteTransition] = useTransition();
  const visibleEntries = useMemo(() => {
    if (!onlyRevealed) return entries;
    return entries.filter((entry) => entry.is_revealed === true);
  }, [entries, onlyRevealed]);

  const allowedIds = useMemo(
    () => new Set(visibleEntries.map((entry) => entry.id)),
    [visibleEntries],
  );

  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visibleEntries.map((entry) => [entry.id, entry.is_favorite === true])),
  );

  useEffect(() => {
    setFavoriteStates(
      Object.fromEntries(visibleEntries.map((entry) => [entry.id, entry.is_favorite === true])),
    );
  }, [visibleEntries]);

  const sections = useMemo(() => {
    const filtered = filterEntriesForOverview(visibleEntries, searchQuery, allowedIds);
    return buildLoreOverviewSections(filtered, { scope, onlyRevealed });
  }, [visibleEntries, searchQuery, scope, onlyRevealed, allowedIds]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  const sectionIds = useMemo(
    () => sections.map((section) => section.id).join("|"),
    [sections],
  );

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const section of sections) {
        if (!next.has(section.id)) {
          next.add(section.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [sectionIds, sections]);

  const handleToggleFavorite = (item: LoreOverviewItem) => {
    if (!showPlayerFeatures) return;
    const currentlyFavorite = favoriteStates[item.id] === true;
    startFavoriteTransition(async () => {
      try {
        await toggleLoreFavorite(item.id, currentlyFavorite);
        setFavoriteStates((prev) => ({
          ...prev,
          [item.id]: !currentlyFavorite,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Fehler beim Aktualisieren der Favoriten.";
        alert(message);
      }
    });
  };

  if (sections.length === 0) {
    return (
      <p className="rounded-lg border border-hero-dark/60 bg-hero-dark/20 px-4 py-6 text-center font-libre text-sm text-gray-400">
        {searchQuery.trim()
          ? "Keine Einträge für diese Suche in der Übersicht."
          : "Noch keine Einträge vorhanden."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <OverviewSection
          key={section.id}
          section={section}
          worldId={worldId}
          campaignId={campaignId}
          isExpanded={expandedSections.has(section.id)}
          showPlayerFeatures={showPlayerFeatures}
          favoriteStates={favoriteStates}
          onToggleFavorite={handleToggleFavorite}
          isFavoritePending={isFavoritePending}
          onToggle={() =>
            setExpandedSections((prev) => {
              const next = new Set(prev);
              if (next.has(section.id)) next.delete(section.id);
              else next.add(section.id);
              return next;
            })
          }
        />
      ))}
    </div>
  );
}
