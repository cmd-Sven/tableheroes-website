"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";

export type StageInitiativeNpcOption = {
  id: string;
  name: string;
  title: string | null;
};

type Props = {
  npcs: StageInitiativeNpcOption[];
  npcIdsInInitiative: Set<string>;
  onAddNpc: (npcId: string, initiativeLabel: string) => Promise<boolean>;
  onAddMarker: (name: string, markerNumber: number, initiativeLabel: string) => Promise<boolean>;
};

export function StageInitiativeComposer({
  npcs,
  npcIdsInInitiative,
  onAddNpc,
  onAddMarker,
}: Props) {
  const [npcQuery, setNpcQuery] = useState("");
  const [npcId, setNpcId] = useState<string | null>(null);
  const [npcInitiative, setNpcInitiative] = useState("");
  const [markerName, setMarkerName] = useState("");
  const [markerNumber, setMarkerNumber] = useState("1");
  const [markerInitiative, setMarkerInitiative] = useState("");
  const [busy, setBusy] = useState<"npc" | "marker" | null>(null);

  const available = useMemo(
    () =>
      [...npcs]
        .filter((npc) => !npcIdsInInitiative.has(String(npc.id)))
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    [npcs, npcIdsInInitiative],
  );

  const matches = useMemo(() => {
    const term = npcQuery.trim().toLowerCase();
    const pool = term
      ? available.filter((npc) =>
          `${npc.name} ${npc.title ?? ""}`.toLowerCase().includes(term),
        )
      : available;
    return pool.slice(0, 6);
  }, [available, npcQuery]);

  const selected = available.find((npc) => npc.id === npcId) ?? null;

  async function submitNpc() {
    if (!selected || busy) return;
    setBusy("npc");
    try {
      const ok = await onAddNpc(selected.id, npcInitiative);
      if (ok) {
        setNpcId(null);
        setNpcQuery("");
        setNpcInitiative("");
      }
    } finally {
      setBusy(null);
    }
  }

  async function submitMarker() {
    if (busy) return;
    const number = Math.floor(Number(markerNumber));
    setBusy("marker");
    try {
      const ok = await onAddMarker(markerName, number, markerInitiative);
      if (ok) {
        setMarkerNumber(String(Number.isFinite(number) && number >= 1 ? number + 1 : 1));
        setMarkerInitiative("");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-hero-border/40 bg-background-dark/80 px-3 py-2.5 shadow-2xl backdrop-blur-md"
    >
      <p className="mb-2 font-barlow text-[11px] font-extrabold uppercase tracking-wide text-accent-gold">
        Initiative ergänzen
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitNpc();
          }}
        >
          <label className="font-barlow text-[10px] font-bold uppercase text-gray-300" htmlFor="stage-init-npc-search">
            NPC
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              id="stage-init-npc-search"
              value={selected ? selected.name : npcQuery}
              onChange={(e) => {
                setNpcId(null);
                setNpcQuery(e.target.value);
              }}
              placeholder="Kampagnen-NPC suchen"
              className="w-full rounded border border-hero-dark bg-slate-900 py-1.5 pl-7 pr-2 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
            />
          </div>
          {selected ? null : matches.length > 0 && npcQuery.trim() ? (
            <ul className="max-h-28 overflow-y-auto rounded border border-hero-dark/70 bg-slate-950/90">
              {matches.map((npc) => (
                <li key={npc.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setNpcId(npc.id);
                      setNpcQuery(npc.name);
                    }}
                    className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left hover:bg-hero-dark/40"
                  >
                    <span className="font-barlow text-xs font-bold text-gray-100">{npc.name}</span>
                    {npc.title ? (
                      <span className="truncate font-libre text-[10px] text-gray-400">{npc.title}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : npcQuery.trim() ? (
            <p className="font-libre text-[10px] text-gray-500">Kein passender NPC.</p>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              value={npcInitiative}
              onChange={(e) => setNpcInitiative(e.target.value)}
              inputMode="numeric"
              placeholder="Init"
              aria-label="Initiative des NPC"
              className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-center font-barlow text-xs font-bold text-accent-gold outline-none focus:border-hero-vibrant"
            />
            <button
              type="submit"
              disabled={!selected || busy != null}
              className="inline-flex items-center gap-1 rounded-lg border border-hero-vibrant/70 bg-hero-vibrant/20 px-2.5 py-1.5 font-barlow text-[11px] font-extrabold uppercase tracking-wide text-hero-vibrant disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {busy === "npc" ? "…" : "NPC aufnehmen"}
            </button>
          </div>
        </form>

        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitMarker();
          }}
        >
          <p className="font-barlow text-[10px] font-bold uppercase text-gray-300">Monster-Marker</p>
          <div className="flex gap-2">
            <input
              value={markerName}
              onChange={(e) => setMarkerName(e.target.value)}
              placeholder="z. B. Goblin"
              aria-label="Name des Monster-Markers"
              className="min-w-0 flex-1 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 font-libre text-xs text-white outline-none focus:border-hero-vibrant"
            />
            <input
              value={markerNumber}
              onChange={(e) => setMarkerNumber(e.target.value)}
              inputMode="numeric"
              aria-label="Nummer des Monster-Markers"
              className="w-14 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-center font-barlow text-xs font-bold text-accent-gold outline-none focus:border-hero-vibrant"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              value={markerInitiative}
              onChange={(e) => setMarkerInitiative(e.target.value)}
              inputMode="numeric"
              placeholder="Init"
              aria-label="Initiative des Monster-Markers"
              className="w-16 rounded border border-hero-dark bg-slate-900 px-2 py-1.5 text-center font-barlow text-xs font-bold text-accent-gold outline-none focus:border-hero-vibrant"
            />
            <button
              type="submit"
              disabled={busy != null || !markerName.trim()}
              className="inline-flex items-center gap-1 rounded-lg border border-accent-gold/70 bg-accent-gold/15 px-2.5 py-1.5 font-barlow text-[11px] font-extrabold uppercase tracking-wide text-accent-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {busy === "marker" ? "…" : "Marker anlegen"}
            </button>
          </div>
          <p className="font-libre text-[10px] leading-snug text-gray-500">
            Wird als „{markerName.trim() || "Name"} {markerNumber.trim() || "1"}“ geführt, ohne Token auf einer Karte.
          </p>
        </form>
      </div>
    </motion.div>
  );
}
