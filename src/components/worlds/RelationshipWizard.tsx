"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  User,
  Users,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  Swords,
  Heart,
} from "lucide-react";
import { getWorldNPCsForRelations } from "@/src/app/dashboard/worlds/world-npc-actions";
import {
  createRelationship,
  updateRelationship,
  type Relationship,
} from "@/src/app/dashboard/worlds/relationship-actions";

const RELATION_ROLES = [
  "Bruder",
  "Schwester",
  "Ehefrau",
  "Ehemann",
  "Mentor",
  "Meister",
  "Vorgesetzter",
  "Ausbilder",
  "Lehrmeister",
  "Erzfeind",
  "Gegenspieler",
  "Liebschaft",
  "Geschäftspartner",
  "Kollege",
  "Kamerad",
  "Verräter",
  "Sklave",
  "Untertan",
  "Diener",
  "Leibeigener",
  "Angestellter",
  "Schüler",
  "Freund",
  "Rivale",
  "Beschützer",
  "Verbündeter",
  "Informant",
  "Auftraggeber",
] as const;

type TargetNPC = { id: string; name: string; image_url?: string | null };

type Props = {
  worldId: string;
  sourceNpc: { id: string; name: string; image_url?: string | null };
  existingRelationship?: Relationship & {
    target_name?: string;
    target_image_url?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
};

export function RelationshipWizard({
  worldId,
  sourceNpc,
  existingRelationship,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const isEditing = !!existingRelationship;
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [saving, setSaving] = useState(false);

  // Step 1: NPC suchen/auswählen
  const [npcs, setNpcs] = useState<TargetNPC[]>([]);
  const [npcSearch, setNpcSearch] = useState("");
  const [loadingNPCs, setLoadingNPCs] = useState(false);
  const [onlyLocal, setOnlyLocal] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<TargetNPC | null>(
    isEditing
      ? {
          id: existingRelationship!.target_id,
          name: existingRelationship!.target_name ?? "Unbekannt",
          image_url: existingRelationship!.target_image_url ?? null,
        }
      : null
  );

  // Step 2: Rollen & Intensität
  const [sourceRole, setSourceRole] = useState(
    existingRelationship?.source_role ?? ""
  );
  const [targetRole, setTargetRole] = useState(
    existingRelationship?.target_role ?? ""
  );
  const [intensity, setIntensity] = useState(
    existingRelationship?.intensity ?? 0
  );

  // Step 3: Monologe
  const [monologueSource, setMonologueSource] = useState(
    existingRelationship?.monologue_source ?? ""
  );
  const [monologueTarget, setMonologueTarget] = useState(
    existingRelationship?.monologue_target ?? ""
  );

  // Step 4: Sichtbarkeit
  const [isPublic, setIsPublic] = useState(
    existingRelationship?.is_public ?? false
  );
  const [publicDescription, setPublicDescription] = useState(
    existingRelationship?.public_description ?? ""
  );

  const loadNPCs = useCallback(async () => {
    setLoadingNPCs(true);
    try {
      const list = await getWorldNPCsForRelations(
        worldId,
        sourceNpc.id,
        onlyLocal
      );
      setNpcs(
        list.map((n: any) => ({
          id: n.id,
          name: n.name,
          image_url: n.image_url ?? null,
        }))
      );
    } finally {
      setLoadingNPCs(false);
    }
  }, [worldId, sourceNpc.id, onlyLocal]);

  useEffect(() => {
    if (step === 1) loadNPCs();
  }, [step, loadNPCs]);

  const filteredNPCs = npcs.filter((n) =>
    n.name.toLowerCase().includes(npcSearch.toLowerCase())
  );

  const getIntensityLabel = (val: number) => {
    if (val <= -75) return "Erzfeinde";
    if (val <= -50) return "Verfeindet";
    if (val <= -25) return "Feindlich";
    if (val < 0) return "Angespannt";
    if (val === 0) return "Neutral";
    if (val <= 25) return "Bekannt";
    if (val <= 50) return "Freundlich";
    if (val <= 75) return "Verbündet";
    return "Seelenverwandte";
  };

  const getIntensityColor = (val: number) => {
    if (val < 0) return "text-red-400";
    if (val === 0) return "text-gray-400";
    return "text-emerald-400";
  };

  const canProceedStep1 = !!selectedTarget;
  const canProceedStep2 = sourceRole.trim() !== "";
  const canProceedStep3 = true;

  const handleSave = async () => {
    if (!selectedTarget) return;
    setSaving(true);
    try {
      if (isEditing && existingRelationship) {
        await updateRelationship(existingRelationship.id, {
          source_role: sourceRole,
          target_role: targetRole,
          intensity,
          monologue_source: monologueSource,
          monologue_target: monologueTarget,
          is_public: isPublic,
          public_description: publicDescription,
        });
      } else {
        await createRelationship({
          world_id: worldId,
          source_id: sourceNpc.id,
          target_id: selectedTarget.id,
          target_type: "npc",
          source_role: sourceRole,
          target_role: targetRole,
          intensity,
          monologue_source: monologueSource,
          monologue_target: monologueTarget,
          is_public: isPublic,
          public_description: publicDescription,
        });
      }
      router.refresh();
      onSuccess();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Speichern der Beziehung.");
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = [
    "Charakter auswählen",
    "Rollen & Intensität",
    "Innere Monologe",
    "Übersicht & Abschluss",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border-2 border-hero-border bg-background-dark shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 text-gray-400 hover:text-white hover:bg-slate-700 z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="border-b border-hero-border bg-black/40 px-6 py-4">
          <h2 className="font-barlow font-extrabold text-xl uppercase tracking-wide text-hero-vibrant flex items-center gap-2">
            <Swords className="h-5 w-5 text-accent-gold" />
            {isEditing
              ? "Beziehung bearbeiten"
              : "Beziehung schmieden"}
          </h2>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {stepTitles.map((title, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={stepNum} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <div
                      className={`h-px w-4 ${isDone ? "bg-hero-vibrant" : "bg-gray-700"}`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-barlow font-bold uppercase ${
                      isActive
                        ? "bg-hero-vibrant text-black"
                        : isDone
                          ? "bg-hero-vibrant/30 text-hero-vibrant"
                          : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {stepNum}. {title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* ========== STEP 1: NPC Auswahl ========== */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                {sourceNpc.image_url ? (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-hero-border">
                    <Image src={sourceNpc.image_url} alt={sourceNpc.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-hero-dark/50 border border-hero-border">
                    <User className="h-6 w-6 text-accent-gold" />
                  </div>
                )}
                <div>
                  <p className="font-barlow font-bold text-sm uppercase text-gray-400">Ausgangspunkt</p>
                  <p className="font-cinzel font-bold text-lg text-accent-gold">{sourceNpc.name}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-600 mx-2" />
                <div>
                  <p className="font-barlow font-bold text-sm uppercase text-gray-400">Ziel auswählen</p>
                  {selectedTarget ? (
                    <p className="font-cinzel font-bold text-lg text-hero-vibrant">{selectedTarget.name}</p>
                  ) : (
                    <p className="font-libre text-sm text-gray-500">Noch nicht gewählt</p>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyLocal}
                  onChange={(e) => setOnlyLocal(e.target.checked)}
                  className="rounded border-hero-dark text-hero-vibrant focus:ring-hero-vibrant"
                />
                <span className="font-barlow font-semibold text-xs uppercase text-gray-400">
                  Nur NPCs am gleichen Ort
                </span>
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={npcSearch}
                  onChange={(e) => setNpcSearch(e.target.value)}
                  placeholder="NPC suchen…"
                  className="w-full rounded bg-slate-900 border border-hero-dark pl-9 pr-3 py-2 text-white text-sm focus:border-hero-vibrant outline-none"
                />
              </div>

              {loadingNPCs ? (
                <div className="flex items-center gap-2 justify-center py-8 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Lade NPCs…
                </div>
              ) : filteredNPCs.length === 0 ? (
                <p className="text-center py-6 font-libre text-sm text-gray-500">
                  Keine passenden NPCs gefunden.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredNPCs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedTarget(n)}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                        selectedTarget?.id === n.id
                          ? "border-hero-vibrant bg-hero-vibrant/10"
                          : "border-hero-dark/50 bg-slate-900/50 hover:border-hero-border"
                      }`}
                    >
                      {n.image_url ? (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border border-hero-border shrink-0">
                          <Image src={n.image_url} alt={n.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-hero-dark/50 border border-hero-border shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <span className="font-barlow font-bold text-xs text-white truncate">
                        {n.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== STEP 2: Rollen & Intensität ========== */}
          {step === 2 && selectedTarget && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 py-2">
                <NPCBadge name={sourceNpc.name} imageUrl={sourceNpc.image_url} />
                <Swords className="h-6 w-6 text-accent-gold" />
                <NPCBadge name={selectedTarget.name} imageUrl={selectedTarget.image_url} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    Wie sieht {sourceNpc.name} den {selectedTarget.name}?
                  </label>
                  <select
                    value={sourceRole}
                    onChange={(e) => setSourceRole(e.target.value)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Rolle wählen —</option>
                    {RELATION_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    Wie sieht {selectedTarget.name} den {sourceNpc.name}?
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full rounded bg-slate-900 border border-hero-dark p-2 text-white text-sm focus:border-hero-vibrant outline-none"
                  >
                    <option value="">— Rolle wählen (optional) —</option>
                    {RELATION_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-2">
                  Intensität: {intensity}{" "}
                  <span className={getIntensityColor(intensity)}>
                    ({getIntensityLabel(intensity)})
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full accent-hero-vibrant h-2 rounded-lg appearance-none bg-linear-to-r from-red-900 via-gray-700 to-emerald-900"
                  />
                  <div className="flex justify-between mt-1 font-libre text-[10px] text-gray-500">
                    <span>-100 Erzfeinde</span>
                    <span>0 Neutral</span>
                    <span>+100 Seelenverwandte</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 3: Innere Monologe ========== */}
          {step === 3 && selectedTarget && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 py-2">
                <NPCBadge name={sourceNpc.name} imageUrl={sourceNpc.image_url} />
                <Heart className="h-5 w-5 text-accent-gold" />
                <NPCBadge name={selectedTarget.name} imageUrl={selectedTarget.image_url} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    Was denkt {sourceNpc.name} über {selectedTarget.name}?
                  </label>
                  <textarea
                    value={monologueSource}
                    onChange={(e) => setMonologueSource(e.target.value)}
                    rows={6}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-sm text-gray-100 outline-none focus:border-hero-vibrant resize-none italic"
                    placeholder={`"Ich habe ${selectedTarget.name} nie vertraut. Hinter dem Lächeln lauert etwas Dunkles…"`}
                  />
                </div>
                <div>
                  <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    Was denkt {selectedTarget.name} über {sourceNpc.name}?
                  </label>
                  <textarea
                    value={monologueTarget}
                    onChange={(e) => setMonologueTarget(e.target.value)}
                    rows={6}
                    className="w-full rounded border border-hero-dark bg-slate-900/80 p-3 font-libre text-sm text-gray-100 outline-none focus:border-hero-vibrant resize-none italic"
                    placeholder={`"${sourceNpc.name} ist ein Narr, aber ein nützlicher…"`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== STEP 4: Übersicht & Abschluss ========== */}
          {step === 4 && selectedTarget && (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-4 py-2">
                <NPCBadge name={sourceNpc.name} imageUrl={sourceNpc.image_url} />
                <div className="text-center">
                  <div className={`font-barlow font-extrabold text-2xl ${getIntensityColor(intensity)}`}>
                    {intensity > 0 ? "+" : ""}{intensity}
                  </div>
                  <div className={`font-barlow font-bold text-xs uppercase ${getIntensityColor(intensity)}`}>
                    {getIntensityLabel(intensity)}
                  </div>
                </div>
                <NPCBadge name={selectedTarget.name} imageUrl={selectedTarget.image_url} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded border border-hero-dark/50 bg-slate-900/50 p-3">
                  <p className="font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    {sourceNpc.name} sieht {selectedTarget.name} als:
                  </p>
                  <p className="font-cinzel font-bold text-hero-vibrant">
                    {sourceRole || "—"}
                  </p>
                </div>
                <div className="rounded border border-hero-dark/50 bg-slate-900/50 p-3">
                  <p className="font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                    {selectedTarget.name} sieht {sourceNpc.name} als:
                  </p>
                  <p className="font-cinzel font-bold text-hero-vibrant">
                    {targetRole || "—"}
                  </p>
                </div>
              </div>

              {(monologueSource || monologueTarget) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {monologueSource && (
                    <div className="rounded border border-hero-dark/50 bg-slate-900/50 p-3">
                      <p className="font-barlow font-bold text-[10px] uppercase text-gray-500 mb-1">
                        {sourceNpc.name} denkt:
                      </p>
                      <p className="font-libre text-xs text-gray-300 italic leading-relaxed">
                        &ldquo;{monologueSource}&rdquo;
                      </p>
                    </div>
                  )}
                  {monologueTarget && (
                    <div className="rounded border border-hero-dark/50 bg-slate-900/50 p-3">
                      <p className="font-barlow font-bold text-[10px] uppercase text-gray-500 mb-1">
                        {selectedTarget.name} denkt:
                      </p>
                      <p className="font-libre text-xs text-gray-300 italic leading-relaxed">
                        &ldquo;{monologueTarget}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-hero-border pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-barlow font-bold text-xs uppercase transition-colors ${
                      !isPublic
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                        : "border-hero-dark text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    <Lock className="h-4 w-4" /> Privat (nur GM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 font-barlow font-bold text-xs uppercase transition-colors ${
                      isPublic
                        ? "border-hero-vibrant bg-hero-vibrant/10 text-hero-vibrant"
                        : "border-hero-dark text-gray-500 hover:border-gray-600"
                    }`}
                  >
                    <Globe className="h-4 w-4" /> Öffentlich (Spieler-Info)
                  </button>
                </div>

                {isPublic && (
                  <div>
                    <label className="block font-barlow font-bold text-xs uppercase text-gray-400 mb-1">
                      Öffentliches Gerücht / Spieler-Info
                    </label>
                    <textarea
                      value={publicDescription}
                      onChange={(e) => setPublicDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-hero-dark bg-slate-900/80 p-2 font-libre text-sm text-gray-100 outline-none focus:border-hero-vibrant resize-none"
                      placeholder="Was wissen Außenstehende oder Spieler über diese Beziehung?"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-hero-border/50">
            <button
              type="button"
              onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
              className="inline-flex items-center gap-1.5 rounded border border-hero-dark px-3 py-2 font-barlow font-bold text-xs uppercase text-gray-400 hover:text-white hover:border-gray-500"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? "Abbrechen" : "Zurück"}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
                className="inline-flex items-center gap-1.5 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold text-xs uppercase text-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Weiter <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded bg-accent-gold px-5 py-2.5 font-barlow font-extrabold text-sm uppercase text-black hover:bg-yellow-400 disabled:opacity-50 shadow-lg shadow-accent-gold/20"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Swords className="h-4 w-4" />
                )}
                {isEditing
                  ? "Beziehung aktualisieren"
                  : "Beziehung zwischen NPCs erstellen"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NPCBadge({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {imageUrl ? (
        <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-hero-border">
          <Image src={imageUrl} alt={name} fill className="object-cover" />
        </div>
      ) : (
        <div className="grid h-14 w-14 place-items-center rounded-full bg-hero-dark/50 border-2 border-hero-border">
          <User className="h-7 w-7 text-accent-gold" />
        </div>
      )}
      <span className="font-barlow font-bold text-xs text-white text-center max-w-[80px] truncate">
        {name}
      </span>
    </div>
  );
}
