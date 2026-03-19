"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Users, MapPin, Loader2, Check, User, AlertCircle, Search, Save } from "lucide-react";
import { updateFactionAllowPcJoin } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { updateLoreAllowPcOrigin } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { updateNPCAllowPcOnboarding } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { BUILDING_LOCATION_TYPES, LARGE_LOCATION_TYPES } from "@/src/lib/lore-types";

type Faction = { id: string; name: string; type?: string; allow_pc_join_on_creation?: boolean };
type Location = { id: string; name: string; type: string; parent_id?: string | null; allow_pc_origin?: boolean };
type NPC = { id: string; name: string; title?: string | null; role?: string | null; allow_pc_onboarding?: boolean };

type PendingChanges = {
  factions: Record<string, boolean>;
  locations: Record<string, boolean>;
  npcs: Record<string, boolean>;
};

type Props = {
  campaignId: string;
  factions: Faction[];
  locations: Location[];
  npcs?: NPC[];
};

type CategoryFilter = "all" | "factions" | "locations" | "npcs";

function matchesSearch(name: string, searchQuery: string, subtitle?: string | null): boolean {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.trim().toLowerCase();
  const nameMatch = name.toLowerCase().includes(q);
  const subMatch = subtitle ? String(subtitle).toLowerCase().includes(q) : false;
  return nameMatch || subMatch;
}

/** Toggle nur lokaler State: Erlaubt (Gold) vs Gesperrt (Grau) */
function OnboardingToggle({
  checked,
  disabled,
  onToggle,
  labelActive = "Erlaubt",
  labelInactive = "Gesperrt",
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  labelActive?: string;
  labelInactive?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-sm font-barlow font-semibold uppercase transition-colors ${
          checked ? "text-hero-vibrant" : "text-zinc-500"
        }`}
      >
        {checked ? labelActive : labelInactive}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 transition-all focus:outline-none focus:ring-2 focus:ring-hero-vibrant/50 focus:ring-offset-2 focus:ring-offset-background-card disabled:opacity-50 disabled:cursor-not-allowed ${
          checked
            ? "border-accent-gold bg-hero-vibrant/20 text-hero-vibrant shadow-[0_0_12px_rgba(55,152,6,0.25)]"
            : "border-zinc-600 bg-zinc-800/80 text-zinc-500 shadow-none"
        }`}
      >
        {checked ? <Check className="h-5 w-5" aria-hidden /> : null}
      </button>
    </div>
  );
}

export function OnboardingSettings({ campaignId, factions, locations, npcs = [] }: Props) {
  const router = useRouter();
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({
    factions: {},
    locations: {},
    npcs: {},
  });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sortedFactions = useMemo(
    () => [...factions].sort((a, b) => a.name.localeCompare(b.name)),
    [factions]
  );
  const largeLocations = useMemo(
    () =>
      [...locations]
        .filter((l) => LARGE_LOCATION_TYPES.includes(l.type as any))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );
  const buildingLocations = useMemo(
    () =>
      [...locations]
        .filter((l) => (BUILDING_LOCATION_TYPES as readonly string[]).includes(l.type))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  );
  const sortedNpcs = useMemo(
    () => [...npcs].sort((a, b) => a.name.localeCompare(b.name)),
    [npcs]
  );

  const filteredFactions = useMemo(
    () => sortedFactions.filter((f) => matchesSearch(f.name, searchQuery, f.type)),
    [sortedFactions, searchQuery]
  );
  const filteredLargeLocations = useMemo(
    () => largeLocations.filter((l) => matchesSearch(l.name, searchQuery, l.type)),
    [largeLocations, searchQuery]
  );
  const filteredBuildingLocations = useMemo(
    () => buildingLocations.filter((l) => matchesSearch(l.name, searchQuery, l.type)),
    [buildingLocations, searchQuery]
  );
  const filteredNpcs = useMemo(
    () =>
      sortedNpcs.filter((n) =>
        matchesSearch(n.name, searchQuery, n.title ?? n.role ?? "")
      ),
    [sortedNpcs, searchQuery]
  );

  const pendingCount =
    Object.keys(pendingChanges.factions).length +
    Object.keys(pendingChanges.locations).length +
    Object.keys(pendingChanges.npcs).length;

  const setFactionPending = useCallback(
    (factionId: string, newValue: boolean) => {
      const original = factions.find((f) => f.id === factionId)?.allow_pc_join_on_creation ?? false;
      setPendingChanges((prev) => {
        const next = { ...prev.factions };
        if (newValue === original) delete next[factionId];
        else next[factionId] = newValue;
        return { ...prev, factions: next };
      });
    },
    [factions]
  );
  const setLocationPending = useCallback(
    (loreId: string, newValue: boolean) => {
      const loc = locations.find((l) => l.id === loreId);
      const original = loc?.allow_pc_origin ?? false;
      setPendingChanges((prev) => {
        const next = { ...prev.locations };
        if (newValue === original) delete next[loreId];
        else next[loreId] = newValue;
        return { ...prev, locations: next };
      });
    },
    [locations]
  );
  const setNPCPending = useCallback(
    (npcId: string, newValue: boolean) => {
      const original = npcs.find((n) => n.id === npcId)?.allow_pc_onboarding ?? false;
      setPendingChanges((prev) => {
        const next = { ...prev.npcs };
        if (newValue === original) delete next[npcId];
        else next[npcId] = newValue;
        return { ...prev, npcs: next };
      });
    },
    [npcs]
  );

  const getFactionValue = useCallback(
    (f: Faction) => pendingChanges.factions[f.id] ?? !!f.allow_pc_join_on_creation,
    [pendingChanges.factions]
  );
  const getLocationValue = useCallback(
    (l: Location) => pendingChanges.locations[l.id] ?? !!l.allow_pc_origin,
    [pendingChanges.locations]
  );
  const getNPCValue = useCallback(
    (n: NPC) => pendingChanges.npcs[n.id] ?? !!n.allow_pc_onboarding,
    [pendingChanges.npcs]
  );

  const hasFactionPending = useCallback(
    (id: string) => id in pendingChanges.factions,
    [pendingChanges.factions]
  );
  const hasLocationPending = useCallback(
    (id: string) => id in pendingChanges.locations,
    [pendingChanges.locations]
  );
  const hasNPCPending = useCallback(
    (id: string) => id in pendingChanges.npcs,
    [pendingChanges.npcs]
  );

  const handleSaveAll = useCallback(async () => {
    if (pendingCount === 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);
    const errors: string[] = [];
    try {
      const promises: Promise<void>[] = [];
      Object.entries(pendingChanges.factions).forEach(([id, allow]) => {
        promises.push(
          updateFactionAllowPcJoin(id, allow).catch((e) => {
            errors.push(`Fraktion: ${e?.message ?? "Fehler"}`);
          })
        );
      });
      Object.entries(pendingChanges.locations).forEach(([id, allow]) => {
        promises.push(
          updateLoreAllowPcOrigin(id, allow).catch((e) => {
            errors.push(`Ort: ${e?.message ?? "Fehler"}`);
          })
        );
      });
      Object.entries(pendingChanges.npcs).forEach(([id, allow]) => {
        promises.push(
          updateNPCAllowPcOnboarding(id, allow).catch((e) => {
            errors.push(`NPC: ${e?.message ?? "Fehler"}`);
          })
        );
      });
      await Promise.all(promises);
      if (errors.length > 0) {
        setErrorMessage(errors.join(" · "));
      } else {
        setPendingChanges({ factions: {}, locations: {}, npcs: {} });
        setSuccessMessage("✅ Onboarding-Daten erfolgreich aktualisiert.");
        setTimeout(() => setSuccessMessage(null), 4000);
        router.refresh();
      }
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }, [pendingCount, pendingChanges, router]);

  const showFactions = categoryFilter === "all" || categoryFilter === "factions";
  const showLocations = categoryFilter === "all" || categoryFilter === "locations";
  const showNpcs = categoryFilter === "all" || categoryFilter === "npcs";

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-950/30 p-4 text-red-200"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="font-libre text-sm flex-1">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded px-2 py-1 text-xs font-barlow uppercase text-red-300 hover:bg-red-900/30"
          >
            Schließen
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-hero-vibrant/50 bg-hero-vibrant/10 p-4 text-hero-vibrant"
        >
          <Check className="h-5 w-5 shrink-0" />
          <p className="font-libre text-sm">{successMessage}</p>
        </div>
      )}

      <p className="font-libre text-gray-400">
        Bestimme, welche Fraktionen, Orte und NPCs Spieler im Charakter-Wizard wählen können. Änderungen werden erst nach Klick auf „Änderungen übernehmen“ gespeichert.
      </p>

      {/* Suchleiste */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Suchen (Name, Typ, Rolle…)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-hero-border/40 bg-zinc-900/60 py-2 pl-10 pr-4 font-libre text-sm text-white placeholder:text-zinc-500 focus:border-hero-vibrant focus:outline-none"
          />
        </div>
        {/* Filter-Pills */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all" as CategoryFilter, label: "Alle" },
              { key: "factions" as CategoryFilter, label: "Fraktionen" },
              { key: "locations" as CategoryFilter, label: "Orte" },
              { key: "npcs" as CategoryFilter, label: "NPCs" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={`rounded-full px-4 py-2 text-sm font-barlow font-bold uppercase transition-colors ${
                categoryFilter === key
                  ? "bg-hero-vibrant text-black"
                  : "border border-hero-border/40 bg-zinc-900/40 text-gray-400 hover:border-hero-vibrant/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Fraktionen ─── */}
      {showFactions && (
        <section>
          <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-gold" />
            Fraktionen – „Beitritt bei Charaktererstellung erlauben“
          </h3>
          {filteredFactions.length === 0 ? (
            <p className="font-libre text-gray-500 text-sm">
              {searchQuery ? "Keine Fraktionen passen zur Suche." : "Keine Fraktionen vorhanden."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredFactions.map((f) => {
                const active = getFactionValue(f);
                const isChanged = hasFactionPending(f.id);
                return (
                  <li
                    key={f.id}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:border-hero-border/40 ${
                      isChanged
                        ? "border-accent-gold/70 bg-accent-gold/5 shadow-[0_0_0_1px_rgba(202,185,38,0.3)]"
                        : "border-hero-border/20 bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-libre text-gray-200 min-w-0">
                        <span className="font-semibold text-white">{f.name}</span>
                        {f.type && <span className="text-zinc-500 ml-2">({f.type})</span>}
                      </span>
                      {isChanged && (
                        <span className="shrink-0 rounded bg-accent-gold/20 px-2 py-0.5 text-xs font-barlow font-bold uppercase text-accent-gold">
                          Geändert
                        </span>
                      )}
                    </div>
                    <OnboardingToggle
                      checked={active}
                      disabled={isSaving}
                      onToggle={() => setFactionPending(f.id, !active)}
                      labelActive="Erlaubt für Spieler"
                      labelInactive="Gesperrt"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {showFactions && (showLocations || showNpcs) && <hr className="border-hero-border/40" />}

      {/* ─── Heimatorte: Große Orte ─── */}
      {showLocations && (
        <>
          <section>
            <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent-gold" />
              Heimatorte – Große Orte (Städte, Regionen)
            </h3>
            <p className="font-libre text-gray-500 text-sm mb-4">
              Spieler wählt hier nur seinen Ursprung (z.B. Stadt oder Region).
            </p>
            {filteredLargeLocations.length === 0 ? (
              <p className="font-libre text-gray-500 text-sm">
                {searchQuery ? "Keine großen Orte passen zur Suche." : "Keine großen Orte vorhanden."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredLargeLocations.map((loc) => {
                  const active = getLocationValue(loc);
                  const isChanged = hasLocationPending(loc.id);
                  return (
                    <li
                      key={loc.id}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:border-hero-border/40 ${
                        isChanged
                          ? "border-accent-gold/70 bg-accent-gold/5 shadow-[0_0_0_1px_rgba(202,185,38,0.3)]"
                          : "border-hero-border/20 bg-zinc-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-libre text-gray-200 min-w-0">
                          <span className="font-semibold text-white">{loc.name}</span>
                          <span className="text-zinc-500 ml-2">({loc.type})</span>
                        </span>
                        {isChanged && (
                          <span className="shrink-0 rounded bg-accent-gold/20 px-2 py-0.5 text-xs font-barlow font-bold uppercase text-accent-gold">
                            Geändert
                          </span>
                        )}
                      </div>
                      <OnboardingToggle
                        checked={active}
                        disabled={isSaving}
                        onToggle={() => setLocationPending(loc.id, !active)}
                        labelActive="Erlaubt"
                        labelInactive="Gesperrt"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ─── Heimatorte: Gebäude ─── */}
          <section>
            <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent-gold" />
              Heimatorte – Gebäude & Institutionen
            </h3>
            <p className="font-libre text-gray-500 text-sm mb-4">
              Wenn erlaubt, dienen diese als spezifische Startpunkte (z.B. Akademie, Tempel).
            </p>
            {filteredBuildingLocations.length === 0 ? (
              <p className="font-libre text-gray-500 text-sm">
                {searchQuery ? "Keine Gebäude passen zur Suche." : "Keine Gebäude/Institutionen vorhanden."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredBuildingLocations.map((loc) => {
                  const active = getLocationValue(loc);
                  const isChanged = hasLocationPending(loc.id);
                  return (
                    <li
                      key={loc.id}
                      className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:border-hero-border/40 ${
                        isChanged
                          ? "border-accent-gold/70 bg-accent-gold/5 shadow-[0_0_0_1px_rgba(202,185,38,0.3)]"
                          : "border-hero-border/20 bg-zinc-900/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-libre text-gray-200 min-w-0">
                          <span className="font-semibold text-white">{loc.name}</span>
                          <span className="text-zinc-500 ml-2">({loc.type})</span>
                        </span>
                        {isChanged && (
                          <span className="shrink-0 rounded bg-accent-gold/20 px-2 py-0.5 text-xs font-barlow font-bold uppercase text-accent-gold">
                            Geändert
                          </span>
                        )}
                      </div>
                      <OnboardingToggle
                        checked={active}
                        disabled={isSaving}
                        onToggle={() => setLocationPending(loc.id, !active)}
                        labelActive="Erlaubt"
                        labelInactive="Gesperrt"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {showLocations && showNpcs && <hr className="border-hero-border/40" />}

      {/* ─── NPCs ─── */}
      {showNpcs && (
        <section>
          <h3 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-accent-gold" />
            NPCs – „In Charaktererstellung als Kontakt anbieten“
          </h3>
          {filteredNpcs.length === 0 ? (
            <p className="font-libre text-gray-500 text-sm">
              {searchQuery ? "Keine NPCs passen zur Suche." : "Keine NPCs vorhanden."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredNpcs.map((npc) => {
                const active = getNPCValue(npc);
                const isChanged = hasNPCPending(npc.id);
                return (
                  <li
                    key={npc.id}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:border-hero-border/40 ${
                      isChanged
                        ? "border-accent-gold/70 bg-accent-gold/5 shadow-[0_0_0_1px_rgba(202,185,38,0.3)]"
                        : "border-hero-border/20 bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-libre text-gray-200 min-w-0">
                        <span className="font-semibold text-white">{npc.name}</span>
                        {(npc.title || npc.role) && (
                          <span className="text-zinc-500 ml-2">({npc.title || npc.role})</span>
                        )}
                      </span>
                      {isChanged && (
                        <span className="shrink-0 rounded bg-accent-gold/20 px-2 py-0.5 text-xs font-barlow font-bold uppercase text-accent-gold">
                          Geändert
                        </span>
                      )}
                    </div>
                    <OnboardingToggle
                      checked={active}
                      disabled={isSaving}
                      onToggle={() => setNPCPending(npc.id, !active)}
                      labelActive="Erlaubt für Spieler"
                      labelInactive="Gesperrt"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Fixierter Footer: Änderungen übernehmen */}
      {pendingCount > 0 && (
        <div className="sticky bottom-0 left-0 right-0 z-10 flex flex-col gap-3 rounded-lg border border-hero-vibrant/40 bg-background-card p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="font-libre text-sm text-gray-300">
            <span className="font-barlow font-bold text-hero-vibrant">{pendingCount}</span>{" "}
            ungespeicherte {pendingCount === 1 ? "Änderung" : "Änderungen"}.
          </p>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-hero-vibrant px-6 py-3 font-barlow font-bold uppercase text-black transition-colors hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Speichern…
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {pendingCount} {pendingCount === 1 ? "Änderung" : "Änderungen"} speichern
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
