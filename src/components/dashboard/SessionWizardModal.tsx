"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  MapPin,
  Users,
  BookOpen,
  Sparkles,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { createSessionWithScenes, getSessionWizardContext } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { createNPC } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { createLoreEntry } from "@/src/app/dashboard/campaigns/[id]/lore-actions";
import { generateNPC, generateLore } from "@/src/app/dashboard/campaigns/[id]/ai-actions";
import { isLocationType } from "@/src/lib/lore-types";

const TOTAL_STEPS = 3;

type Props = {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  locations: Array<{ id: string; name: string; type: string }>;
  npcs: Array<{ id: string; name: string; title: string | null }>;
  onSuccess: () => void;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const d = new Date(y, mo, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const TIME_QUICK = [
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

function SessionCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const selected = value ? parseIsoLocalDate(value) : null;
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (value) {
      const d = parseIsoLocalDate(value);
      if (d) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekdayMon0 = (new Date(year, month, 1).getDay() + 6) % 7;

  const cells = useMemo(() => {
    const list: Array<{ day: number | null }> = [];
    for (let i = 0; i < firstWeekdayMon0; i += 1) list.push({ day: null });
    for (let d = 1; d <= daysInMonth; d += 1) list.push({ day: d });
    return list;
  }, [year, month, firstWeekdayMon0, daysInMonth]);

  const monthTitle = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(cursor);

  const today = new Date();
  const todayIso = toIsoLocalDate(today);

  return (
    <div className="rounded border border-hero-border/50 bg-slate-950/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid h-9 w-9 place-items-center rounded border border-hero-border text-gray-300 hover:bg-hero-dark hover:text-white"
          aria-label="Vorheriger Monat"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-barlow text-sm font-bold capitalize text-accent-gold">{monthTitle}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid h-9 w-9 place-items-center rounded border border-hero-border text-gray-300 hover:bg-hero-dark hover:text-white"
          aria-label="Nächster Monat"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center font-barlow text-[10px] font-bold uppercase text-gray-500">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          if (c.day == null) {
            return <div key={`e-${idx}`} className="aspect-square" />;
          }
          const iso = `${year}-${pad2(month + 1)}-${pad2(c.day)}`;
          const isSel = value === iso;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              className={`aspect-square rounded text-sm font-barlow font-semibold transition-colors ${
                isSel
                  ? "bg-hero-vibrant text-black ring-2 ring-hero-border"
                  : isToday
                    ? "border border-amber-600/60 text-amber-200 hover:bg-hero-dark"
                    : "text-gray-200 hover:bg-hero-dark hover:text-white"
              }`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hero-border/30 pt-3">
        <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">ISO / Import:</span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-hero-dark bg-slate-900 px-2 py-1 font-mono text-xs text-white focus:border-hero-vibrant outline-none"
        />
      </div>
    </div>
  );
}

export function SessionWizardModal({ campaignId, isOpen, onClose, locations, npcs, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [logistics, setLogistics] = useState({
    title: "",
    date: "",
    time: "",
    duration: "4",
  });

  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedNPCIds, setSelectedNPCIds] = useState<string[]>([]);
  const [npcSearch, setNpcSearch] = useState("");

  const [wizardContext, setWizardContext] = useState<{
    averagePartyLevel: number;
    lastSession: {
      id: string;
      title: string;
      status: string;
      end_time: string | null;
      summary: string;
    } | null;
  } | null>(null);
  const [recapText, setRecapText] = useState("");

  /** Schritt 3: geplante Handlung (frei, keine KI-Pflicht) */
  const [plotNotes, setPlotNotes] = useState("");

  const loreLocations = useMemo(
    () => locations.filter((l) => isLocationType(l.type)),
    [locations],
  );

  const filteredNpcs = useMemo(() => {
    const q = npcSearch.trim().toLowerCase();
    if (!q) return npcs;
    return npcs.filter((n) => {
      const name = (n.name || "").toLowerCase();
      const title = (n.title || "").toLowerCase();
      return name.includes(q) || title.includes(q);
    });
  }, [npcs, npcSearch]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void getSessionWizardContext(campaignId)
      .then((context) => {
        if (cancelled) return;
        setWizardContext(context);
        if (context.lastSession?.summary) {
          setRecapText((prev) => (prev.trim() === "" ? context.lastSession!.summary : prev));
        }
      })
      .catch((error) => {
        console.error("Error loading wizard context:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, campaignId]);

  const handleClose = () => {
    setCurrentStep(1);
    setLogistics({ title: "", date: "", time: "", duration: "4" });
    setSelectedLocationId("");
    setSelectedNPCIds([]);
    setNpcSearch("");
    setPlotNotes("");
    setRecapText("");
    setWizardContext(null);
    setIsGenerating(null);
    onClose();
  };

  const handleGenerateLocation = async () => {
    const prompt = window.prompt("Beschreibe kurz den Ort für diese Session:");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating("location");
    try {
      const result = await generateLore(campaignId, prompt);
      const newLocation = await createLoreEntry({
        campaign_id: campaignId,
        name: result.name || "",
        type: "Ort",
        description: result.description || undefined,
        gm_notes: result.gm_notes || undefined,
      });
      setSelectedLocationId(newLocation.id);
      onSuccess();
      alert(`Ort „${newLocation.name}" wurde erstellt und ausgewählt.`);
    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Fehler bei der Generierung.");
    } finally {
      setIsGenerating(null);
    }
  };

  function buildNpcGenerationContext(userIdea: string): string {
    const parts: string[] = [
      "KONTEXT (Session-Wizard der Kampagne — bitte konsistent einhalten):",
      `Spielleiter-Idee / Gruppe: ${userIdea}`,
    ];
    if (recapText.trim()) {
      parts.push(`Bisher / Recap (Auszug): ${recapText.trim().slice(0, 1200)}`);
    }
    if (logistics.title.trim()) {
      parts.push(`Geplanter Session-Titel: ${logistics.title.trim()}`);
    }
    const loc = loreLocations.find((l) => l.id === selectedLocationId);
    if (loc) {
      parts.push(`Schauplatz: ${loc.name} (Typ: ${loc.type})`);
    }
    const selNames = npcs.filter((n) => selectedNPCIds.includes(n.id)).map((n) => n.name);
    if (selNames.length > 0) {
      parts.push(`Bereits ausgewählte NPCs (Rollen ggf. ergänzen, nicht duplizieren ohne Grund): ${selNames.join(", ")}`);
    }
    parts.push(`Ungefähres Party-Level (Richtwert): ${wizardContext?.averagePartyLevel ?? 1}`);
    if (plotNotes.trim()) {
      parts.push(`Geplante Handlung (Auszug): ${plotNotes.trim().slice(0, 800)}`);
    }
    return parts.join("\n");
  }

  const handleGenerateNPCGroup = async () => {
    const prompt = window.prompt("Beschreibe die NPC-Gruppe (z. B. „Drei Banditen in der Taverne“):");
    if (!prompt || !prompt.trim()) return;

    setIsGenerating("npc-group");
    try {
      const ctx = buildNpcGenerationContext(prompt.trim());
      const generatedIds: string[] = [];
      const labels = ["Erster NPC der Gruppe", "Zweiter NPC der Gruppe", "Dritter NPC der Gruppe"];
      for (let i = 0; i < 3; i += 1) {
        try {
          const fullPrompt = `${ctx}\n\nAufgabe: ${labels[i]}. Klar abgrenzbare Rolle, Name und Motivation passend zur Idee.`;
          const result = await generateNPC(campaignId, fullPrompt);
          const newNPC = await createNPC({
            campaign_id: campaignId,
            name: result.name || "",
            title: result.title || undefined,
            description: result.description || undefined,
            gm_notes: result.gm_notes || undefined,
          });
          generatedIds.push(newNPC.id);
        } catch (err) {
          console.error("Error generating NPC:", err);
        }
      }
      if (generatedIds.length === 0) {
        alert("Es konnte kein NPC erzeugt werden. Bitte später erneut versuchen oder manuell anlegen.");
        return;
      }
      setSelectedNPCIds((prev) => [...prev, ...generatedIds]);
      onSuccess();
      alert(`${generatedIds.length} NPC(s) wurden erstellt und ausgewählt.`);
    } catch (error: unknown) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Fehler bei der Generierung.");
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSubmit = () => {
    if (!logistics.title.trim() || !logistics.date || !logistics.time) {
      alert("Bitte Titel, Datum und Uhrzeit ausfüllen.");
      return;
    }

    startTransition(async () => {
      try {
        const dateTimeString = `${logistics.date}T${logistics.time}:00`;
        const startTime = new Date(dateTimeString);
        if (Number.isNaN(startTime.getTime())) {
          alert("Ungültiges Datum oder Uhrzeit.");
          return;
        }
        const durationHours = parseInt(logistics.duration, 10);
        const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

        const loc = loreLocations.find((l) => l.id === selectedLocationId);
        const sceneTitle = logistics.title.trim();
        const sceneBody =
          plotNotes.trim() ||
          "Vorbereitung: Details kannst du später in der Session-Vorbereitung und auf der Bühne ergänzen.";
        const sceneGm = [
          recapText.trim() && `Recap / Was bisher geschah:\n${recapText.trim()}`,
          loc && `Start-Ort (world_lore): ${loc.name} (${loc.type})`,
          selectedNPCIds.length > 0 &&
            `Vorgemerkte NPC-IDs für die Bühne: ${selectedNPCIds.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n\n");

        await createSessionWithScenes({
          campaign_id: campaignId,
          title: logistics.title.trim(),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location_id: selectedLocationId || null,
          scenes: [
            {
              title: sceneTitle,
              description: sceneBody,
              gm_notes: sceneGm || undefined,
              order: 0,
            },
          ],
        });

        onSuccess();
        handleClose();
      } catch (error: unknown) {
        console.error(error);
        alert(error instanceof Error ? error.message : "Fehler beim Speichern der Session.");
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-hero-dark bg-background-card shadow-2xl">
        <div className="flex-none border-b border-hero-dark bg-background-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
                Session planen
              </h2>
              <p className="mt-1 font-libre text-sm text-gray-400">
                Schritt {currentStep} von {TOTAL_STEPS}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-2 text-gray-400 transition-colors hover:text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-hero-dark bg-background-dark px-6 py-3">
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded ${step <= currentStep ? "bg-hero-vibrant" : "bg-hero-dark"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center gap-3">
                <Calendar className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow text-xl font-bold uppercase text-white">Logistik &amp; Bühne</h3>
              </div>

              {wizardContext?.lastSession && wizardContext.lastSession.status === "Live" ? (
                <div className="flex items-start gap-3 rounded border-2 border-yellow-600/50 bg-yellow-900/20 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                  <div>
                    <p className="mb-1 font-barlow text-sm font-bold uppercase text-yellow-400">
                      Letzte Session noch live
                    </p>
                    <p className="font-libre text-sm text-yellow-200">
                      „{wizardContext.lastSession.title}" hat noch den Status Live. Beende sie ggf. zuerst in den
                      Terminen.
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                  Was bisher geschah (Recap)
                </label>
                <textarea
                  value={recapText}
                  onChange={(e) => setRecapText(e.target.value)}
                  placeholder="Kurz für dich und die Gruppe: Stand der Kampagne …"
                  rows={4}
                  className="w-full resize-none rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant"
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  {wizardContext?.lastSession
                    ? `Vorausgefüllt aus: „${wizardContext.lastSession.title}"`
                    : "Optional — hilft dir beim späteren Spiel."}
                </p>
              </div>

              <div>
                <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                  Titel der Session *
                </label>
                <input
                  type="text"
                  value={logistics.title}
                  onChange={(e) => setLogistics((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="z. B. Die alte Anlegestelle"
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 text-white outline-none focus:border-hero-vibrant"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                    Datum *
                  </label>
                  <SessionCalendar value={logistics.date} onChange={(iso) => setLogistics((p) => ({ ...p, date: iso }))} />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                      Uhrzeit *
                    </label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {TIME_QUICK.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setLogistics((p) => ({ ...p, time: t }))}
                          className={`rounded border px-2.5 py-1 font-barlow text-xs font-bold uppercase transition-colors ${
                            logistics.time === t
                              ? "border-hero-vibrant bg-hero-vibrant/20 text-hero-vibrant"
                              : "border-hero-border/60 bg-slate-900 text-gray-300 hover:border-hero-vibrant"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      type="time"
                      value={logistics.time}
                      onChange={(e) => setLogistics((prev) => ({ ...prev, time: e.target.value }))}
                      className="w-full max-w-[12rem] rounded border border-hero-dark bg-slate-900 p-3 text-white outline-none focus:border-hero-vibrant"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                      Dauer (Stunden)
                    </label>
                    <select
                      value={logistics.duration}
                      onChange={(e) => setLogistics((prev) => ({ ...prev, duration: e.target.value }))}
                      className="w-full rounded border border-hero-dark bg-slate-900 p-3 text-white outline-none focus:border-hero-vibrant"
                    >
                      <option value="2">2 Stunden</option>
                      <option value="3">3 Stunden</option>
                      <option value="4">4 Stunden</option>
                      <option value="5">5 Stunden</option>
                      <option value="6">6 Stunden</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-hero-border/40 pt-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent-gold" />
                  <h4 className="font-barlow text-sm font-bold uppercase text-white">Die Bühne — Startort</h4>
                </div>
                <p className="mb-3 font-libre text-xs text-gray-500">
                  Optional. Ort kannst du auch später in der Planung setzen. Es erscheinen alle Ort-Typen aus Welt
                  &amp; Lore (z. B. Taverne, Stadt, Region).
                </p>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">— Kein Ort —</option>
                  {loreLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
                <div className="mt-4 border-t border-hero-dark pt-4">
                  <button
                    type="button"
                    onClick={() => void handleGenerateLocation()}
                    disabled={isGenerating === "location" || isPending}
                    className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow text-sm font-bold uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating === "location" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generiere …
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Neuen Ort per KI anlegen
                      </>
                    )}
                  </button>
                  <p className="mt-2 font-libre text-xs text-gray-500">
                    Wie unter Welt &amp; Lore: KI schlägt Name und Text vor, du speicherst als neuen Ort-Typ „Ort".
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center gap-3">
                <Users className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow text-xl font-bold uppercase text-white">Session-Besetzung (NPCs)</h3>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 font-barlow text-sm font-bold uppercase text-gray-300">
                  <Search className="h-4 w-4 text-gray-500" />
                  Suche
                </label>
                <input
                  type="search"
                  value={npcSearch}
                  onChange={(e) => setNpcSearch(e.target.value)}
                  placeholder="Name oder Titel filtern …"
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 text-white outline-none focus:border-hero-vibrant"
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  {filteredNpcs.length} von {npcs.length} NPCs
                </p>
              </div>

              <div>
                <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                  NPCs auswählen
                </label>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded border border-hero-dark bg-slate-900 p-3">
                  {npcs.length === 0 ? (
                    <p className="py-4 text-center font-libre text-sm text-gray-500">Noch keine NPCs vorhanden.</p>
                  ) : filteredNpcs.length === 0 ? (
                    <p className="py-4 text-center font-libre text-sm text-gray-500">Keine Treffer für die Suche.</p>
                  ) : (
                    filteredNpcs.map((npc) => (
                      <label
                        key={npc.id}
                        className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNPCIds.includes(npc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNPCIds((prev) => [...prev, npc.id]);
                            } else {
                              setSelectedNPCIds((prev) => prev.filter((id) => id !== npc.id));
                            }
                          }}
                          className="rounded border-hero-dark"
                        />
                        <span className="font-libre text-white">
                          {npc.name}
                          {npc.title ? <span className="text-gray-500"> ({npc.title})</span> : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="border-t border-hero-dark pt-4">
                <button
                  type="button"
                  onClick={() => void handleGenerateNPCGroup()}
                  disabled={isGenerating === "npc-group" || isPending}
                  className="flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow text-sm font-bold uppercase text-accent-gold transition-colors hover:bg-accent-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating === "npc-group" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generiere …
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      NPC-Gruppe per KI
                    </>
                  )}
                </button>
                <p className="mt-2 font-libre text-xs text-gray-500">
                  Die KI erhält Recap, Session-Titel, Startort, bereits gewählte NPCs und Party-Level — optional auch
                  deine Handlung aus Schritt 3, falls du sie schon ausgefüllt hast (Reihenfolge: du kannst Schritt 3
                  vorher kurz besuchen oder Text nachtragen und hier erneut generieren).
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="mb-2 flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-accent-gold" />
                <h3 className="font-barlow text-xl font-bold uppercase text-white">Die Handlung</h3>
              </div>
              <p className="font-libre text-sm text-gray-400">
                Kurz festhalten, was du dir für den Abend vorstellst — rein für dich und die Vorbereitung. Es wird
                keine KI-Szenario- oder Quest-Generierung gestartet.
              </p>
              <div>
                <label className="mb-2 block font-barlow text-sm font-bold uppercase text-gray-300">
                  Geplante Handlung (optional)
                </label>
                <textarea
                  value={plotNotes}
                  onChange={(e) => setPlotNotes(e.target.value)}
                  placeholder="z. B. Die Gruppe soll die Spuren am Kai untersuchen und auf einen Informanten treffen …"
                  rows={8}
                  className="w-full resize-none rounded border border-hero-dark bg-slate-900 p-3 font-libre text-white outline-none focus:border-hero-vibrant"
                />
                <p className="mt-1 font-libre text-xs text-gray-500">
                  Wenn du nichts einträgst, legen wir eine kurze Platzhalter-Beschreibung in der ersten Szene an — du
                  kannst alles später in der Session-Vorbereitung ergänzen.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-none flex items-center justify-between border-t border-hero-dark bg-background-card p-6">
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="rounded border border-hero-border bg-background-dark px-4 py-2 font-barlow text-sm font-bold uppercase text-gray-300 transition-colors hover:border-hero-vibrant hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Zurück
          </button>

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1))}
              className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition-colors hover:bg-hero-vibrant"
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded border border-hero-border bg-hero-vibrant px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition-colors hover:bg-hero-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Speichere …" : "Session erstellen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
