"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles, Save, ArrowLeft, MapPin, BookOpen } from "lucide-react";
import { generateBeastForWorld, createBestariumCreature, type GeneratedBeastResult } from "@/src/app/dashboard/worlds/world-bestarium-actions";

type Props = {
  worldId: string;
  worldName: string;
  /** Geografische Orte (world_lore), gleiche IDs wie für location_id beim Speichern. */
  locations: Array<{ id: string; name: string; type: string }>;
  loreEntries: Array<{ id: string; name: string; type: string | null }>;
  initialBriefing?: string | null;
  onClose: () => void;
  onSaved: (creatureId: string) => void;
};

export function BeastCreatorWizard({
  worldId,
  worldName,
  locations,
  loreEntries,
  initialBriefing = null,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [briefing, setBriefing] = useState(initialBriefing ?? "");
  const [targetCr, setTargetCr] = useState("");
  /** Vorkommen (world_lore) – Pflicht für KI & Weltbezug */
  const [habitatId, setHabitatId] = useState("");
  /** Optionaler zweiter Lore-Eintrag nur für den Prompt */
  const [contextLoreId, setContextLoreId] = useState("");
  const [generated, setGenerated] = useState<GeneratedBeastResult | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [loreId, setLoreId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const contextLoreOptions = loreEntries.filter((e) => e.id !== habitatId);

  const handleGenerate = () => {
    setError(null);

    if (!habitatId.trim()) {
      setError("Bitte wähle ein Vorkommen (Ort). Die KI nutzt Beschreibung und GM-Notizen des Ortes aus der Welt.");
      return;
    }
    if (locations.length === 0) {
      setError("Es sind noch keine Orte in dieser Welt hinterlegt. Lege zuerst unter „Orte“ oder „Lore“ einen geografischen Ort an.");
      return;
    }

    const crNorm = Number(String(targetCr).trim().replace(",", "."));
    if (!Number.isFinite(crNorm) || crNorm < 0) {
      setError("Bitte gib einen gültigen Ziel-Schwierigkeitsgrad (CR) ein, z. B. 0.25, 1 oder 8.");
      return;
    }

    startTransition(async () => {
      try {
        const beast = await generateBeastForWorld(worldId, {
          briefing: briefing.trim(),
          targetCr: crNorm,
          habitatLoreId: habitatId.trim(),
          contextLoreId: contextLoreId.trim() || null,
        });
        setGenerated(beast);
        setLocationId(habitatId.trim());
        setStep(2);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Generierung fehlgeschlagen.";
        setError(msg);
      }
    });
  };

  const handleSave = () => {
    if (!generated) return;
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await createBestariumCreature({
          ...generated,
          world_id: worldId,
          location_id: locationId || null,
          lore_id: loreId || null,
        });
        onSaved(id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
        setError(msg);
      }
    });
  };

  const descPreview =
    generated?.physical_description?.trim().slice(0, 380) ??
    "";
  const descTruncated =
    generated?.physical_description && generated.physical_description.trim().length > 380;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/75">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-hero-border bg-background-card shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between border-b border-hero-dark px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-gold" />
            <h2 className="font-barlow font-bold text-lg uppercase text-hero-vibrant tracking-wide">
              Beast-Creator · {worldName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-gray-400 hover:bg-hero-dark hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="font-libre text-sm text-gray-300">
                  Die KI setzt <span className="text-accent-gold">Schwierigkeitsgrad (CR)</span>,{" "}
                  <span className="text-accent-gold">Attribute</span>, RK, TP und Angriffe passend zueinander und schreibt eine{" "}
                  <span className="text-accent-gold">ausführliche Beschreibung</span> – immer im Kontext deiner Welt und vor allem
                  des gewählten <span className="text-accent-gold">Vorkommens</span> (Ort aus dem Lore).
                </p>

                <label className="block">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-accent-gold" />
                    Vorkommen (Pflicht)
                  </span>
                  <select
                    value={habitatId}
                    onChange={(e) => setHabitatId(e.target.value)}
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                    required
                  >
                    <option value="">— Ort wählen —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.type})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 font-libre text-xs text-gray-500">
                    Es werden Name, Typ, Beschreibung und GM-Notizen dieses Lore-Eintrags an die KI übergeben.
                  </p>
                </label>

                <label className="block">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-accent-gold" />
                    Zusätzlicher Lore-Kontext (optional)
                  </span>
                  <select
                    value={contextLoreId}
                    onChange={(e) => setContextLoreId(e.target.value)}
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— keiner —</option>
                    {contextLoreOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.type ? ` · ${l.type}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 font-libre text-xs text-gray-500">
                    Z. B. Fraktion, Legende oder Kultur – wird nur für die Generierung genutzt, nicht automatisch verknüpft.
                  </p>
                </label>

                <label className="block max-w-xs">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400">
                    Ziel-Schwierigkeitsgrad CR (Pflicht)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={targetCr}
                    onChange={(e) => setTargetCr(e.target.value)}
                    placeholder="z. B. 2 oder 0.25"
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                  />
                  <p className="mt-1 font-libre text-xs text-gray-500">
                    Attribute und Werte werden an dieses CR angeglichen (D&amp;D-5e-Logik).
                  </p>
                </label>

                <label className="block">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400">Ideen / Briefing (optional)</span>
                  <textarea
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    rows={5}
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-3 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                    placeholder="z. B. „Schwarm“, „einzelnes Alpha-Tier“, „verflucht“, „meidet Feuer“ …"
                  />
                </label>
              </motion.div>
            )}

            {step === 2 && generated && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </button>

                <div className="rounded border border-hero-border/60 bg-background-dark/50 p-4 space-y-3 font-libre text-sm text-gray-200">
                  <h3 className="font-cinzel font-bold text-xl text-accent-gold">{generated.name}</h3>
                  <p className="text-gray-400">
                    {generated.size_category} {generated.creature_type}
                    {generated.subtype ? ` (${generated.subtype})` : ""} · {generated.alignment}
                  </p>
                  <p>
                    <span className="text-accent-gold">RK</span> {generated.armor_class ?? "—"} ·{" "}
                    <span className="text-accent-gold">TP</span> {generated.hit_points ?? "—"}{" "}
                    {generated.hit_dice ? `(${generated.hit_dice})` : ""} ·{" "}
                    <span className="text-accent-gold">CR</span> {generated.challenge_rating ?? "—"} ·{" "}
                    <span className="text-accent-gold">XP</span> {generated.xp_awarded ?? "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Attribute: STR {generated.ability_str ?? "—"} · DEX {generated.ability_dex ?? "—"} · CON{" "}
                    {generated.ability_con ?? "—"} · INT {generated.ability_int ?? "—"} · WIS {generated.ability_wis ?? "—"} · CHA{" "}
                    {generated.ability_cha ?? "—"}
                  </p>
                  {descPreview && (
                    <div className="pt-2 border-t border-hero-dark">
                      <p className="font-barlow font-bold uppercase text-xs text-accent-gold mb-1">Beschreibung (Auszug)</p>
                      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {descPreview}
                        {descTruncated ? "…" : ""}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 pt-2 border-t border-hero-dark">
                    Nach dem Speichern kannst du Statblock und Texte im Formular anpassen.
                  </p>
                </div>

                <label className="block">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400">Ort beim Speichern</span>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— kein Ort —</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.type})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="font-barlow font-bold uppercase text-xs text-gray-400">
                    Lore-Eintrag verknüpfen (optional)
                  </span>
                  <select
                    value={loreId}
                    onChange={(e) => setLoreId(e.target.value)}
                    className="mt-1 w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— kein Lore —</option>
                    {loreEntries.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                        {l.type ? ` · ${l.type}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 font-libre text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-hero-dark px-4 py-3 flex justify-end gap-2 shrink-0">
          {step === 1 ? (
            <button
              type="button"
              disabled={isPending || locations.length === 0}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark hover:bg-hero-dark hover:text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Mit KI generieren
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || !generated}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark hover:bg-hero-dark hover:text-white transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Im Bestarium speichern
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
