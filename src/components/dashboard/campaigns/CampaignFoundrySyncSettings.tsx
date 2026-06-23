"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Link2,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import type { CampaignFoundrySyncSettings } from "@/src/app/dashboard/campaigns/[id]/foundry-sync-actions";
import {
  assignFoundryCharacterMapping,
  createFoundryCharacterMapping,
  deleteFoundryCharacterMapping,
  regenerateCampaignFoundryApiKey,
} from "@/src/app/dashboard/campaigns/[id]/foundry-sync-actions";

type Props = {
  campaignId: string;
  initial: CampaignFoundrySyncSettings;
};

function actorIdBase(actorId: string): string {
  return actorId.startsWith("Actor.") ? actorId.slice(6) : actorId;
}

export function CampaignFoundrySyncSettings({ campaignId, initial }: Props) {
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [mappings, setMappings] = useState(initial.mappings);
  const [draftCharacterByMapping, setDraftCharacterByMapping] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        initial.mappings.map((m) => [m.id, m.characterId ?? ""]),
      ),
  );
  const [newActorId, setNewActorId] = useState("");
  const [newCharacterId, setNewCharacterId] = useState("");
  const [copiedField, setCopiedField] = useState<"apiUrl" | "apiKey" | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [savingMappingId, setSavingMappingId] = useState<string | null>(null);
  const [deletingMappingId, setDeletingMappingId] = useState<string | null>(null);
  const [creatingMapping, setCreatingMapping] = useState(false);

  const duplicateActorHints = useMemo(() => {
    const byBase = new Map<string, string[]>();
    for (const mapping of mappings) {
      const base = actorIdBase(mapping.foundryActorId);
      const list = byBase.get(base) ?? [];
      list.push(mapping.foundryActorId);
      byBase.set(base, list);
    }
    const hints = new Set<string>();
    for (const ids of byBase.values()) {
      if (ids.length > 1) {
        for (const id of ids) hints.add(id);
      }
    }
    return hints;
  }, [mappings]);

  const unmappedCount = mappings.filter((m) => !m.characterId).length;

  async function copyText(value: string, field: "apiUrl" | "apiKey") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success("In Zwischenablage kopiert.");
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  }

  async function handleRegenerateKey() {
    const confirmed = window.confirm(
      "API-Key wirklich neu generieren? Der alte Key funktioniert danach in Foundry nicht mehr.",
    );
    if (!confirmed) return;

    setRegenerating(true);
    try {
      const result = await regenerateCampaignFoundryApiKey(campaignId);
      if (!result.success || !result.apiKey) {
        toast.error(result.error ?? "Key konnte nicht erneuert werden.");
        return;
      }
      setApiKey(result.apiKey);
      toast.success("Neuer API-Key erstellt. Bitte in Foundry eintragen.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveMapping(mappingId: string) {
    const characterId = draftCharacterByMapping[mappingId]?.trim() || null;
    setSavingMappingId(mappingId);
    try {
      const result = await assignFoundryCharacterMapping(campaignId, mappingId, characterId);
      if (!result.success) {
        toast.error(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      const character = initial.characters.find((c) => c.id === characterId);
      setMappings((prev) =>
        prev.map((m) =>
          m.id === mappingId
            ? {
                ...m,
                characterId,
                characterName: character?.name ?? null,
              }
            : m,
        ),
      );
      toast.success("Zuordnung gespeichert.");
    } finally {
      setSavingMappingId(null);
    }
  }

  async function handleDeleteMapping(mappingId: string) {
    const confirmed = window.confirm("Diese Foundry-Zuordnung wirklich löschen?");
    if (!confirmed) return;

    setDeletingMappingId(mappingId);
    try {
      const result = await deleteFoundryCharacterMapping(campaignId, mappingId);
      if (!result.success) {
        toast.error(result.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setMappings((prev) => prev.filter((m) => m.id !== mappingId));
      setDraftCharacterByMapping((prev) => {
        const next = { ...prev };
        delete next[mappingId];
        return next;
      });
      toast.success("Zuordnung gelöscht.");
    } finally {
      setDeletingMappingId(null);
    }
  }

  async function handleCreateMapping(e: React.FormEvent) {
    e.preventDefault();
    if (!newActorId.trim()) {
      toast.error("Foundry Actor-ID eingeben.");
      return;
    }

    setCreatingMapping(true);
    try {
      const result = await createFoundryCharacterMapping(
        campaignId,
        newActorId,
        newCharacterId || null,
      );
      if (!result.success) {
        toast.error(result.error ?? "Anlegen fehlgeschlagen.");
        return;
      }

      toast.success("Zuordnung angelegt. Seite wird aktualisiert …");
      window.location.reload();
    } finally {
      setCreatingMapping(false);
    }
  }

  return (
    <div
      id="foundry-sync"
      className="rounded-lg border border-hero-dark bg-background-card p-6 scroll-mt-24"
    >
      <h3 className="font-barlow font-bold text-lg text-white uppercase mb-2 flex items-center gap-2">
        <Link2 className="h-5 w-5 text-hero-vibrant" aria-hidden />
        Foundry Sync
      </h3>
      <p className="font-libre text-xs text-gray-400 mb-4 leading-relaxed">
        Verbinde Foundry VTT mit dieser Kampagne. Trage den API-Key im Foundry-Modul
        „Table Heroes Bridge“ ein — nicht die Kampagnen-ID aus der URL.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block mb-1.5 font-barlow font-bold uppercase text-xs text-gray-300">
            API-URL (Foundry-Modul)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={initial.apiUrl}
              className="flex-1 rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white font-mono focus:border-hero-vibrant outline-none"
            />
            <button
              type="button"
              onClick={() => copyText(initial.apiUrl, "apiUrl")}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant transition-colors"
            >
              {copiedField === "apiUrl" ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Kopieren
            </button>
          </div>
        </div>

        <div>
          <label className="block mb-1.5 font-barlow font-bold uppercase text-xs text-gray-300">
            API-Key (nur für diese Kampagne)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              readOnly
              value={apiKey}
              className="min-w-0 flex-1 rounded bg-slate-900 border border-hero-dark p-2.5 text-sm text-white font-mono focus:border-hero-vibrant outline-none"
            />
            <button
              type="button"
              onClick={() => copyText(apiKey, "apiKey")}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-gray-200 hover:border-hero-vibrant transition-colors"
            >
              {copiedField === "apiKey" ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Kopieren
            </button>
            <button
              type="button"
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="inline-flex items-center gap-1 rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 font-barlow font-bold uppercase text-xs text-amber-200 hover:bg-amber-900/40 transition-colors disabled:opacity-60"
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Neu generieren
            </button>
          </div>
          <p className="mt-1 font-libre text-[11px] text-gray-500">
            Foundry: Welt-Einstellungen → Modul „Table Heroes Bridge“ → API-URL und API-Key
            eintragen → Welt neu laden.
          </p>
        </div>
      </div>

      <div className="border-t border-hero-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 className="font-barlow font-bold uppercase text-sm text-accent-gold">
            Actor ↔ Charakter
          </h4>
          {unmappedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-950/30 px-2.5 py-1 font-barlow text-[11px] uppercase text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {unmappedCount} ohne Zuordnung
            </span>
          ) : mappings.length > 0 ? (
            <span className="font-barlow text-[11px] uppercase text-green-400">
              Alle zugeordnet
            </span>
          ) : null}
        </div>

        <p className="font-libre text-xs text-gray-500 mb-4">
          Beim ersten Sync legt Foundry automatisch Einträge an. Ordne jeden Actor einem
          Table-Heroes-Charakter zu. Die Actor-ID beginnt in Foundry mit{" "}
          <span className="font-mono text-gray-400">Actor.</span>
        </p>

        {duplicateActorHints.size > 0 ? (
          <div className="mb-4 rounded border border-amber-700/40 bg-amber-950/20 p-3 font-libre text-xs text-amber-100">
            Doppelte Actor-IDs erkannt (mit und ohne „Actor.“-Präfix). Behalte nur die
            vollständige ID und lösche die Duplikate.
          </div>
        ) : null}

        {mappings.length === 0 ? (
          <p className="font-libre text-sm text-gray-500 italic py-3">
            Noch keine Foundry-Actors registriert. Öffne in Foundry einen Charakterbogen mit
            Tab „Table Heroes“ oder starte einen XP-Sync.
          </p>
        ) : (
          <div className="space-y-3">
            {mappings.map((mapping) => {
              const isDuplicate = duplicateActorHints.has(mapping.foundryActorId);
              const isUnmapped = !mapping.characterId;
              const draftValue = draftCharacterByMapping[mapping.id] ?? "";
              const isDirty = draftValue !== (mapping.characterId ?? "");

              return (
                <div
                  key={mapping.id}
                  className={`rounded border p-3 ${
                    isUnmapped
                      ? "border-amber-700/40 bg-amber-950/10"
                      : "border-hero-border/40 bg-background-dark"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-white break-all">
                        {mapping.foundryActorId}
                      </p>
                      {mapping.foundryActorName ? (
                        <p className="font-libre text-xs text-gray-500 mt-0.5">
                          {mapping.foundryActorName}
                        </p>
                      ) : null}
                      {isDuplicate ? (
                        <p className="font-libre text-[11px] text-amber-300 mt-1">
                          Mögliches Duplikat — bitte bereinigen
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMapping(mapping.id)}
                      disabled={deletingMappingId === mapping.id}
                      className="inline-flex items-center gap-1 rounded border border-red-800/50 bg-red-950/20 px-2 py-1 font-barlow text-[10px] uppercase text-red-300 hover:bg-red-900/30 disabled:opacity-60"
                    >
                      {deletingMappingId === mapping.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Löschen
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={draftValue}
                      onChange={(e) =>
                        setDraftCharacterByMapping((prev) => ({
                          ...prev,
                          [mapping.id]: e.target.value,
                        }))
                      }
                      className="min-w-[220px] flex-1 rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white focus:border-hero-vibrant outline-none"
                    >
                      <option value="">— Kein Charakter —</option>
                      {initial.characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name} ({character.playerName})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveMapping(mapping.id)}
                      disabled={!isDirty || savingMappingId === mapping.id}
                      className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors disabled:opacity-50"
                    >
                      {savingMappingId === mapping.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Speichern
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleCreateMapping} className="mt-5 pt-4 border-t border-hero-border/50">
          <p className="font-barlow font-bold uppercase text-xs text-gray-300 mb-2">
            Manuell hinzufügen
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={newActorId}
              onChange={(e) => setNewActorId(e.target.value)}
              placeholder="Actor.JDCHjFwedGiy606x"
              className="min-w-[220px] flex-1 rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white font-mono focus:border-hero-vibrant outline-none"
              spellCheck={false}
            />
            <select
              value={newCharacterId}
              onChange={(e) => setNewCharacterId(e.target.value)}
              className="min-w-[200px] rounded bg-slate-900 border border-hero-dark p-2 text-sm text-white focus:border-hero-vibrant outline-none"
            >
              <option value="">— Optional: Charakter —</option>
              {initial.characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name} ({character.playerName})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={creatingMapping}
              className="inline-flex items-center gap-1 rounded border border-hero-border bg-hero-dark px-3 py-2 font-barlow font-bold uppercase text-xs text-white hover:bg-hero-vibrant transition-colors disabled:opacity-60"
            >
              {creatingMapping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
