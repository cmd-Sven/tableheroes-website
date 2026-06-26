"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { isLocationType } from "@/src/lib/lore-types";
import {
  buildLoreOverviewSections,
  countLoreOverviewItems,
  type BuildLoreOverviewOptions,
  type LoreOverviewItem,
  type LoreOverviewLocationNode,
  type LoreOverviewSection,
  type LoreOverviewSourceEntry,
} from "@/src/lib/lore-overview";

type Props = {
  entries: LoreOverviewSourceEntry[];
  worldId: string;
  searchQuery?: string;
  scope?: BuildLoreOverviewOptions["scope"];
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
): LoreOverviewSourceEntry[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return entries;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const directHits = new Set(
    entries.filter((entry) => matchesSearch(entry, q)).map((entry) => entry.id),
  );

  // Rasse-Treffer → zugehörige Kultur mit anzeigen
  for (const entry of entries) {
    if (entry.type !== "Rasse" || !directHits.has(entry.id)) continue;
    if (entry.culture_id) directHits.add(entry.culture_id);
  }
  for (const culture of entries.filter((e) => e.type === "Kultur")) {
    if (!directHits.has(culture.id)) continue;
    for (const raceId of culture.race_ids ?? []) {
      if (raceId?.trim()) directHits.add(raceId.trim());
    }
  }

  // Ort-Treffer → Elternkette und Unterorte einbeziehen
  const locationEntries = entries.filter((entry) => isLocationType(entry.type));

  for (const entry of locationEntries) {
    if (!directHits.has(entry.id)) continue;
    let parentId = entry.parent_id?.trim() || null;
    while (parentId && byId.has(parentId)) {
      directHits.add(parentId);
      parentId = byId.get(parentId)?.parent_id?.trim() || null;
    }
  }

  const addDescendants = (parentId: string) => {
    for (const entry of locationEntries) {
      if (entry.parent_id === parentId && !directHits.has(entry.id)) {
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

  return entries.filter((entry) => directHits.has(entry.id));
}

function resolveDetailHref(item: LoreOverviewItem, worldId: string): string {
  if (isLocationType(item.type)) {
    return `/dashboard/worlds/${worldId}/locations/${item.id}`;
  }
  return `/dashboard/worlds/${worldId}/lore/${item.id}`;
}

function EntryLink({
  item,
  worldId,
  href,
  subtle = false,
}: {
  item: LoreOverviewItem;
  worldId: string;
  href?: string;
  subtle?: boolean;
}) {
  return (
    <Link
      href={href ?? resolveDetailHref(item, worldId)}
      className={`group flex items-baseline justify-between gap-3 rounded px-2 py-1.5 transition-colors hover:bg-hero-dark/50 ${
        subtle ? "text-gray-300" : "text-white"
      }`}
    >
      <span className="font-libre group-hover:text-hero-vibrant">{item.name}</span>
      <span className="shrink-0 font-barlow text-[10px] font-bold uppercase text-gray-500">
        {item.type}
      </span>
    </Link>
  );
}

function LocationTreeList({
  nodes,
  worldId,
  depth = 0,
}: {
  nodes: LoreOverviewLocationNode[];
  worldId: string;
  depth?: number;
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
          <EntryLink item={node.item} worldId={worldId} subtle={depth > 0} />
          {node.children.length > 0 ? (
            <LocationTreeList nodes={node.children} worldId={worldId} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function OverviewSection({
  section,
  worldId,
  isExpanded,
  onToggle,
}: {
  section: LoreOverviewSection;
  worldId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const count = countLoreOverviewItems(section);

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
        <span className="rounded-full bg-hero-dark px-2 py-0.5 font-barlow text-xs text-gray-400">
          {count}
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-hero-dark/50 px-4 py-3">
          {section.locationTree && section.locationTree.length > 0 ? (
            <LocationTreeList nodes={section.locationTree} worldId={worldId} />
          ) : null}

          {section.cultureGroups && section.cultureGroups.length > 0 ? (
            <ul className="space-y-3">
              {section.cultureGroups.map((group) => (
                <li key={group.culture.id}>
                  <EntryLink item={group.culture} worldId={worldId} />
                  {group.races.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 border-l border-hero-border/40 ml-3 pl-2">
                      {group.races.map((race) => (
                        <li key={race.id}>
                          <EntryLink item={race} worldId={worldId} subtle />
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
                    <EntryLink item={race} worldId={worldId} subtle />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.entries.length > 0 ? (
            <ul className="space-y-0.5">
              {section.entries.map((entry) => (
                <li key={entry.id}>
                  <EntryLink item={entry} worldId={worldId} />
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
  searchQuery = "",
  scope = "all",
}: Props) {
  const sections = useMemo(() => {
    const filtered = filterEntriesForOverview(entries, searchQuery);
    return buildLoreOverviewSections(filtered, { scope });
  }, [entries, searchQuery, scope]);

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
          isExpanded={expandedSections.has(section.id)}
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
