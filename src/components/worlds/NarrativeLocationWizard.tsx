"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { LOCATION_TYPES, SUGGESTED_PARENT_TYPES } from "@/src/lib/lore-types";
import { generateLocationFromBriefing } from "@/src/app/dashboard/worlds/world-location-actions";
import { createLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";

type Props = {
  worldId: string;
  worldName: string;
  locations: Array<{ id: string; name: string; type: string }>;
  initialType?: string;
  initialParentId?: string;
  onSuccess?: (locationId: string) => void;
  onError?: (message: string) => void;
};

const stepTransition = { type: "tween" as const, duration: 0.3 };

export function NarrativeLocationWizard({
  worldId,
  worldName,
  locations,
  initialType,
  initialParentId,
  onSuccess,
  onError,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isPending, startTransition] = useTransition();

  const resolvedType = initialType && (LOCATION_TYPES as readonly string[]).includes(initialType) ? initialType : LOCATION_TYPES[0];
  const [selectedType, setSelectedType] = useState<string>(resolvedType);
  const [parentId, setParentId] = useState<string | null>(initialParentId ?? null);
  const [briefing, setBriefing] = useState("");
  const [generated, setGenerated] = useState<{
    name: string;
    description: string;
    gm_notes: string | null;
  } | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedGmNotes, setEditedGmNotes] = useState("");

  const parentOptions = locations.filter((l) => {
    const suggested = SUGGESTED_PARENT_TYPES[selectedType];
    if (!suggested || suggested.length === 0) return false;
    return suggested.includes(l.type);
  });
  const parentName = parentId ? parentOptions.find((p) => p.id === parentId)?.name : null;

  const handleStep2Generate = () => {
    startTransition(async () => {
      try {
        const result = await generateLocationFromBriefing(worldId, {
          type: selectedType,
          parentName: parentName ?? undefined,
          briefing: briefing.trim() || `Erstelle einen ${selectedType}.`,
        });
        setGenerated(result);
        setEditedName(result.name);
        setEditedDescription(result.description);
        setEditedGmNotes(result.gm_notes ?? "");
        setStep(3);
      } catch (e: any) {
        const msg = e?.message || "Fehler bei der KI-Generierung.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  const handleStep4Create = () => {
    const name = editedName.trim();
    if (!name) {
      alert("Bitte einen Namen eingeben.");
      return;
    }
    startTransition(async () => {
      try {
        const lore = await createLoreEntry({
          world_id: worldId,
          name,
          type: selectedType,
          parent_id: parentId ?? undefined,
          description: editedDescription.trim() || undefined,
          gm_notes: editedGmNotes.trim() || undefined,
        });
        const loreId = (lore as { id: string }).id;
        onSuccess?.(loreId);
        router.push(`/dashboard/worlds/${worldId}/lore/${loreId}`);
      } catch (e: any) {
        const msg = e?.message || "Fehler beim Anlegen des Orts.";
        onError?.(msg);
        if (typeof window !== "undefined") alert(msg);
      }
    });
  };

  return (
    <div className="rounded-lg border border-hero-dark bg-background-card p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between border-b border-hero-border pb-4">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
          Narrativer Orts-Architekt
        </h1>
        <span className="font-barlow font-bold text-sm uppercase text-gray-400">
          Schritt {step} von 4
        </span>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
            className="space-y-6"
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Schritt 1: Orts-Typ & Einordnung
            </h2>
            <p className="font-libre text-gray-200 text-sm">
              Wähle den Typ des Orts und ggf. den übergeordneten Ort (z.B. Land für eine Stadt).
            </p>

            {/* Typ-Auswahl */}
            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                Orts-Typ *
              </label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setParentId(null);
                }}
                className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Parent-Auswahl (falls sinnvoll) */}
            {parentOptions.length > 0 && (
              <div>
                <label className="mb-2 block font-barlow font-bold text-sm uppercase text-gray-300">
                  Übergeordneter Ort (optional)
                </label>
                <select
                  value={parentId ?? ""}
                  onChange={(e) => setParentId(e.target.value || null)}
                  className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
                >
                  <option value="">— Keiner —</option>
                  {parentOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.type}: {l.name}
                    </option>
                  ))}
                </select>
                {parentOptions.length === 0 && SUGGESTED_PARENT_TYPES[selectedType]?.length && (
                  <p className="mt-1 text-xs text-amber-400 font-libre">
                    Noch keine passenden Orte vorhanden. Du kannst später in der Detailansicht ein Land oder eine Region verknüpfen.
                  </p>
                )}
              </div>
            )}

            {SUGGESTED_PARENT_TYPES[selectedType]?.length && parentOptions.length === 0 && (
              <p className="rounded border border-amber-500/50 bg-amber-900/20 p-3 text-sm text-amber-200 font-libre">
                Für &quot;{selectedType}&quot; wären passende Eltern: {SUGGESTED_PARENT_TYPES[selectedType].join(", ")}. Noch nicht vorhanden – nach dem Erstellen kannst du in der Detailansicht verknüpfen oder ein Land/Region anlegen.
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 transition-colors"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
            className="space-y-6"
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Schritt 2: Briefing
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              Beschreibe den {selectedType} – Atmosphäre, Besonderheiten, wichtige Fakten. Die KI erstellt daraus eine Spieler-Beschreibung.
            </p>

            <div>
              <label className="mb-2 block font-barlow font-bold text-sm uppercase text-accent-gold">
                Briefing / GM-Beschreibung
              </label>
              <textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={5}
                placeholder={`z.B.: Beschreibe die Atmosphäre, typische Gebäude, Bevölkerung, Klima, besondere Ereignisse oder Geheimnisse des ${selectedType}. Die KI nutzt das für die Spieler-Beschreibung.`}
                className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none resize-y placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:bg-hero-dark transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
              <button
                type="button"
                onClick={handleStep2Generate}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generiere…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    KI-Beschreibung erstellen
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
            className="space-y-6"
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Schritt 3: Texte finalisieren
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              Prüfe und bearbeite die KI-generierten Texte. Danach wird der Ort angelegt.
            </p>

            {generated && (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block font-barlow font-bold text-xs uppercase text-gray-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none"
                    placeholder="Name des Orts"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-xs uppercase text-gray-400">
                    Spieler-Beschreibung (was Spieler beim Betreten sehen)
                  </label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={5}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none resize-y"
                    placeholder="Beschreibung"
                  />
                </div>
                <div>
                  <label className="mb-2 block font-barlow font-bold text-xs uppercase text-gray-400">
                    GM-Notizen (optional, nur für GM sichtbar)
                  </label>
                  <textarea
                    value={editedGmNotes}
                    onChange={(e) => setEditedGmNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-3 text-white font-libre focus:border-hero-vibrant outline-none resize-y"
                    placeholder="Interne Notizen"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:bg-hero-dark transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!generated || !editedName.trim()}
                className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant/20 px-4 py-2 font-barlow font-bold text-sm uppercase text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={stepTransition}
            className="space-y-6"
          >
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Schritt 4: Ort anlegen
            </h2>
            <p className="font-libre text-gray-200 mb-4">
              Bestätige die Erstellung. Du wirst zur Detailseite weitergeleitet.
            </p>

            <div className="rounded border border-hero-border bg-slate-900/40 p-4 space-y-2">
              <p><span className="font-barlow font-bold text-gray-400">Typ:</span> <span className="text-hero-vibrant">{selectedType}</span></p>
              <p><span className="font-barlow font-bold text-gray-400">Name:</span> {editedName}</p>
              {parentName && <p><span className="font-barlow font-bold text-gray-400">In:</span> {parentName}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded border border-hero-border px-4 py-2 font-barlow font-bold text-sm uppercase text-gray-300 hover:bg-hero-dark transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
              <button
                type="button"
                onClick={handleStep4Create}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded border border-hero-vibrant bg-hero-vibrant px-4 py-2 font-barlow font-bold text-sm uppercase text-white hover:bg-hero-dark disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Anlegen…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Ort anlegen & zur Übersicht
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
