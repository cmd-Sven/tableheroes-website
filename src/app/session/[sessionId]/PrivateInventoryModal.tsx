"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Briefcase,
  Coins,
  FlaskConical,
  Info,
  Minus,
  Plus,
  ScrollText,
  Shield,
  Sword,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCharacterItem,
  getCharacterInventory,
  updateCharacterWealth,
} from "@/src/lib/actions/character-inventory-actions";
import { distributeRations } from "@/src/lib/actions/downtime-actions";
import {
  type CharacterGem,
  type CharacterInventoryPayload,
  type CharacterItem,
  type CharacterWealth,
  type InventoryCategory,
} from "@/src/types/inventory";
import { ItemEditorModal } from "./ItemEditorModal";

type InventoryTab = InventoryCategory;

type InventoryCharacter = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  avatar_url: string | null;
};

const TABS: Array<{ id: InventoryTab; label: string }> = [
  { id: "Weapon", label: "Waffen" },
  { id: "Equipment", label: "Ausrüstung" },
  { id: "Consumable", label: "Verbrauchsgüter" },
  { id: "Story", label: "Story-Items" },
  { id: "CoinGem", label: "Coins & Gems" },
];

function visualForTab(tab: InventoryTab) {
  if (tab === "Weapon") {
    return {
      Icon: Sword,
      className: "bg-red-950 text-red-200 shadow-[0_0_18px_rgba(127,29,29,0.55)]",
    };
  }
  if (tab === "Consumable") {
    return {
      Icon: FlaskConical,
      className: "bg-blue-950 text-blue-200 shadow-[0_0_18px_rgba(30,58,138,0.55)]",
    };
  }
  if (tab === "Story") {
    return {
      Icon: ScrollText,
      className: "bg-amber-950 text-accent-gold shadow-[0_0_18px_rgba(146,64,14,0.55)]",
    };
  }
  if (tab === "CoinGem") {
    return {
      Icon: Coins,
      className: "bg-yellow-950 text-yellow-200 shadow-[0_0_18px_rgba(202,138,4,0.55)]",
    };
  }
  return {
    Icon: Briefcase,
    className: "bg-emerald-950 text-emerald-200 shadow-[0_0_18px_rgba(6,78,59,0.55)]",
  };
}

function iconForItem(item: Pick<CharacterItem, "category" | "icon_type">) {
  const icon = item.icon_type ?? "";
  if (item.category === "Weapon" || icon.includes("sword")) return Sword;
  if (item.category === "Consumable" || icon.includes("flask")) return FlaskConical;
  if (item.category === "Story" || icon.includes("scroll")) return ScrollText;
  if (item.category === "CoinGem") return Coins;
  return Briefcase;
}

function emptyWealth(characterId: string): CharacterWealth {
  return {
    id: "",
    character_id: characterId,
    gp: 0,
    sp: 0,
    cp: 0,
    ep: 0,
    pp: 0,
    gem_data: [],
  };
}

function currencyField(label: string, value: number, onChange: (value: number) => void) {
  return (
    <label className="block">
      <span className="mb-1 block font-barlow text-[10px] font-bold uppercase text-accent-gold/80">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded bg-black/35 px-2 py-1.5 font-barlow text-xs font-bold text-white outline-none focus:bg-black/55"
      />
    </label>
  );
}

type GmRationsDistributionProps = {
  sessionId: string;
  partyCharacters: Array<{
    id: string;
    name: string;
    rations_count: number;
    starvation_days: number;
  }>;
  onDistributed: () => void | Promise<void>;
};

export function PrivateInventoryModal({
  character,
  onClose,
  gmRationsDistribution,
}: {
  character: InventoryCharacter;
  onClose: () => void;
  gmRationsDistribution?: GmRationsDistributionProps;
}) {
  const [activeTab, setActiveTab] = useState<InventoryTab>("Weapon");
  const [payload, setPayload] = useState<CharacterInventoryPayload | null>(null);
  const [wealthDraft, setWealthDraft] = useState<CharacterWealth>(() =>
    emptyWealth(character.id),
  );
  const [editorItem, setEditorItem] = useState<CharacterItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isSavingWealth, startSavingWealth] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [rationsModalOpen, setRationsModalOpen] = useState(false);
  const [rationsDraft, setRationsDraft] = useState<Record<string, number>>({});
  const [isDistributing, startDistributing] = useTransition();

  function openRationsModal() {
    if (!gmRationsDistribution) return;
    const next: Record<string, number> = {};
    for (const pc of gmRationsDistribution.partyCharacters) {
      next[pc.id] = 0;
    }
    setRationsDraft(next);
    setRationsModalOpen(true);
  }

  function maxRationsAdd(pc: { id: string; rations_count: number }) {
    const cur = Math.min(10, Math.max(0, Math.round(pc.rations_count)));
    return Math.max(0, 10 - cur);
  }

  function distributeRationsSubmit() {
    if (!gmRationsDistribution) return;
    setError(null);
    startDistributing(async () => {
      try {
        const res = await distributeRations(
          gmRationsDistribution.sessionId,
          rationsDraft,
        );
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setRationsModalOpen(false);
        try {
          const inv = await getCharacterInventory(character.id);
          setPayload(inv);
          setWealthDraft(inv.wealth);
        } catch {
          /* ignore */
        }
        await gmRationsDistribution.onDistributed();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Rationen konnten nicht verteilt werden.",
        );
      }
    });
  }

  useEffect(() => {
    setError(null);
    startLoading(async () => {
      try {
        const next = await getCharacterInventory(character.id);
        setPayload(next);
        setWealthDraft(next.wealth);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Inventar konnte nicht geladen werden.",
        );
      }
    });
  }, [character.id]);

  const visibleItems = useMemo(
    () => (payload?.items ?? []).filter((item) => item.category === activeTab),
    [activeTab, payload?.items],
  );

  const gemTotal = wealthDraft.gem_data.reduce(
    (sum, gem) => sum + Math.max(0, Number(gem.estimated_value) || 0),
    0,
  );

  function openCreate() {
    setEditorItem(null);
    setIsEditorOpen(true);
  }

  function handleSaved(item: CharacterItem) {
    setPayload((current) => {
      if (!current) return current;
      const exists = current.items.some((row) => row.id === item.id);
      return {
        ...current,
        items: exists
          ? current.items.map((row) => (row.id === item.id ? item : row))
          : [...current.items, item],
      };
    });
    setActiveTab(item.category === "CoinGem" ? "Equipment" : item.category);
    setIsEditorOpen(false);
  }

  function deleteItem(item: CharacterItem) {
    startDeleting(async () => {
      try {
        await deleteCharacterItem(item.id);
        setPayload((current) =>
          current
            ? { ...current, items: current.items.filter((row) => row.id !== item.id) }
            : current,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Item konnte nicht geloescht werden.");
      }
    });
  }

  function saveWealth() {
    setError(null);
    startSavingWealth(async () => {
      try {
        const saved = await updateCharacterWealth({
          characterId: character.id,
          gp: wealthDraft.gp,
          sp: wealthDraft.sp,
          cp: wealthDraft.cp,
          ep: wealthDraft.ep,
          pp: wealthDraft.pp,
          gems: wealthDraft.gem_data,
        });
        setWealthDraft(saved);
        setPayload((current) => (current ? { ...current, wealth: saved } : current));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Coins & Gems konnten nicht gespeichert werden.",
        );
      }
    });
  }

  function updateGem(index: number, patch: Partial<CharacterGem>) {
    setWealthDraft((current) => ({
      ...current,
      gem_data: current.gem_data.map((gem, i) =>
        i === index ? { ...gem, ...patch } : gem,
      ),
    }));
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-20 backdrop-blur-sm">
        <div
          className="relative h-[min(82vh,760px)] w-[min(92vw,520px)] overflow-visible bg-cover bg-center bg-no-repeat drop-shadow-[0_28px_55px_rgba(0,0,0,0.75)]"
          style={{
            backgroundImage: "url('/images/Session_ui/rucksack_offen.webp')",
          }}
        >
          <div className="absolute inset-x-0 -top-16 z-20 flex justify-center gap-3">
            {TABS.map((tab) => (
              (() => {
                const visual = visualForTab(tab.id);
                const Icon = visual.Icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`grid h-12 w-12 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${visual.className} ${
                      isActive
                        ? "scale-110 ring-2 ring-accent-gold"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    title={tab.label}
                    aria-label={tab.label}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </button>
                );
              })()
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-[13%] top-[10%] z-30 rounded-full bg-black/35 p-1.5 text-stone-200 transition-colors hover:bg-black/60 hover:text-white"
            aria-label="Inventar schließen"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute inset-x-[16%] bottom-[13%] top-[17%] z-10 flex flex-col overflow-hidden px-2 py-3">
            <div className="mb-3 shrink-0 text-center">
              <h2 className="truncate font-barlow text-xl font-extrabold uppercase tracking-wide text-slate-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]">
                {character.name}
              </h2>
              <p className="font-libre text-[10px] text-slate-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]">
                Privater Rucksack
              </p>
              {gmRationsDistribution && gmRationsDistribution.partyCharacters.length > 0 ? (
                <button
                  type="button"
                  onClick={openRationsModal}
                  className="mt-2 rounded-full border border-hero-vibrant/50 bg-hero-vibrant/15 px-3 py-1.5 font-barlow text-[10px] font-bold uppercase text-hero-vibrant hover:bg-hero-vibrant/25"
                >
                  Jagdbeute / Rationen verteilen
                </button>
              ) : null}
            </div>

            {error ? (
              <p className="mb-3 rounded bg-red-950/70 px-3 py-2 font-libre text-xs text-red-100">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {isLoading ? (
              <p className="font-libre text-sm text-slate-100">Inventar wird geladen...</p>
            ) : activeTab === "CoinGem" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {currencyField("GP", wealthDraft.gp, (gp) =>
                    setWealthDraft((current) => ({ ...current, gp })),
                  )}
                  {currencyField("SP", wealthDraft.sp, (sp) =>
                    setWealthDraft((current) => ({ ...current, sp })),
                  )}
                  {currencyField("CP", wealthDraft.cp, (cp) =>
                    setWealthDraft((current) => ({ ...current, cp })),
                  )}
                  {currencyField("EP", wealthDraft.ep, (ep) =>
                    setWealthDraft((current) => ({ ...current, ep })),
                  )}
                  {currencyField("PP", wealthDraft.pp, (pp) =>
                    setWealthDraft((current) => ({ ...current, pp })),
                  )}
                </div>

                <div className="rounded-xl bg-black/25 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">
                      Edelsteine
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setWealthDraft((current) => ({
                          ...current,
                          gem_data: [
                            ...current.gem_data,
                            { name: "", estimated_value: 0 },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 rounded-full bg-accent-gold/20 px-2.5 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold/30"
                    >
                      <Plus className="h-3 w-3" />
                      Stein
                    </button>
                  </div>

                  <div className="space-y-2">
                    {wealthDraft.gem_data.map((gem, index) => (
                      <div key={index} className="grid grid-cols-[1fr_5rem_auto] gap-1.5">
                        <input
                          value={gem.name}
                          onChange={(e) => updateGem(index, { name: e.target.value })}
                          placeholder="Name"
                          className="rounded bg-black/35 px-2 py-1.5 font-libre text-xs text-white outline-none focus:bg-black/55"
                        />
                        <input
                          type="number"
                          min={0}
                          value={gem.estimated_value}
                          onChange={(e) =>
                            updateGem(index, {
                              estimated_value: Number(e.target.value),
                            })
                          }
                          placeholder="Wert"
                          className="rounded bg-black/35 px-2 py-1.5 font-barlow text-xs font-bold text-white outline-none focus:bg-black/55"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setWealthDraft((current) => ({
                              ...current,
                              gem_data: current.gem_data.filter((_, i) => i !== index),
                            }))
                          }
                          className="rounded bg-red-950/50 px-2 text-red-200 hover:bg-red-900/70"
                          aria-label="Edelstein entfernen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2">
                    <span className="font-libre text-xs text-slate-100">
                      Edelstein-Summe
                    </span>
                    <span className="font-barlow text-base font-extrabold text-accent-gold">
                      {gemTotal} GP
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={saveWealth}
                    disabled={isSavingWealth}
                    className="rounded-full bg-accent-gold/20 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/30 disabled:opacity-50"
                  >
                    {isSavingWealth ? "Speichert..." : "Coins & Gems speichern"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-gold/20 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold hover:bg-accent-gold/30"
                  >
                    <Plus className="h-4 w-4" />
                    Item
                  </button>
                </div>

                {visibleItems.length === 0 ? (
                  <div className="rounded-xl bg-black/25 px-4 py-8 text-center">
                    <Shield className="mx-auto mb-2 h-8 w-8 text-accent-gold/80" />
                    <p className="font-libre text-sm text-slate-100">
                      Keine Einträge in dieser Kategorie.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleItems.map((item) => {
                      const Icon = iconForItem(item);
                      return (
                        <div
                          key={item.id}
                          className="group flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2.5"
                        >
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background-card/80">
                            <Icon className="h-4 w-4 text-accent-gold" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditorItem(item);
                              setIsEditorOpen(true);
                            }}
                            className="min-w-0 flex-1 text-left font-barlow text-xs font-bold uppercase text-white hover:text-accent-gold"
                          >
                            <span className="block truncate">{item.name}</span>
                          </button>
                          <div className="relative">
                            <Info className="peer h-4 w-4 text-accent-gold/80" />
                            <div className="pointer-events-none absolute right-0 top-6 z-10 hidden w-56 rounded bg-background-dark p-3 font-libre text-xs text-gray-200 shadow-xl peer-hover:block">
                              {item.description || "Keine Beschreibung hinterlegt."}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteItem(item)}
                            disabled={isDeleting}
                            className="rounded p-1 text-red-300 opacity-80 transition-colors hover:bg-red-950/50 hover:text-red-100 disabled:opacity-40"
                            aria-label={`${item.name} löschen`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {isEditorOpen ? (
        <ItemEditorModal
          characterId={character.id}
          item={editorItem}
          onClose={() => setIsEditorOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {rationsModalOpen && gmRationsDistribution ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-3 py-6">
          <div
            className="max-h-[min(80vh,520px)] w-full max-w-md overflow-y-auto rounded-xl border border-accent-gold/40 bg-background-card p-4 shadow-2xl"
            role="dialog"
            aria-label="Rationen verteilen"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="font-barlow text-sm font-extrabold uppercase tracking-wide text-accent-gold">
                Jagdbeute / Rationen
              </h3>
              <button
                type="button"
                onClick={() => setRationsModalOpen(false)}
                className="rounded p-1 text-gray-400 hover:bg-background-dark hover:text-white"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {gmRationsDistribution.partyCharacters.map((pc) => {
                const add = Math.max(0, Math.round(rationsDraft[pc.id] ?? 0));
                const cap = maxRationsAdd(pc);
                const preview = Math.min(10, pc.rations_count + add);
                return (
                  <li
                    key={pc.id}
                    className="flex flex-wrap items-center gap-2 rounded border border-hero-border/40 bg-background-dark/70 px-2 py-2 font-libre text-xs text-gray-200"
                  >
                    <span className="min-w-0 flex-1 font-barlow font-bold text-accent-gold">
                      {pc.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      jetzt {pc.rations_count}/10 → {preview}/10
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={add <= 0 || isDistributing}
                        onClick={() =>
                          setRationsDraft((prev) => ({
                            ...prev,
                            [pc.id]: Math.max(0, (prev[pc.id] ?? 0) - 1),
                          }))
                        }
                        className="grid h-8 w-8 place-items-center rounded border border-hero-dark bg-slate-900 text-gray-200 hover:border-accent-gold disabled:opacity-30"
                        aria-label="Weniger Rationen"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={cap}
                        value={add}
                        disabled={isDistributing}
                        onChange={(e) => {
                          const n = Math.max(
                            0,
                            Math.min(cap, Math.round(Number(e.target.value) || 0)),
                          );
                          setRationsDraft((prev) => ({ ...prev, [pc.id]: n }));
                        }}
                        className="w-12 rounded border border-hero-dark bg-slate-900 px-1 py-1 text-center font-barlow text-sm text-white outline-none focus:border-accent-gold"
                      />
                      <button
                        type="button"
                        disabled={add >= cap || isDistributing}
                        onClick={() =>
                          setRationsDraft((prev) => ({
                            ...prev,
                            [pc.id]: Math.min(cap, (prev[pc.id] ?? 0) + 1),
                          }))
                        }
                        className="grid h-8 w-8 place-items-center rounded border border-hero-dark bg-slate-900 text-gray-200 hover:border-accent-gold disabled:opacity-30"
                        aria-label="Mehr Rationen"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDistributing}
                onClick={() => setRationsModalOpen(false)}
                className="rounded border border-gray-600 px-3 py-2 font-barlow text-[10px] font-bold uppercase text-gray-300 hover:bg-background-dark"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={isDistributing}
                onClick={distributeRationsSubmit}
                className="rounded border border-accent-gold bg-accent-gold/20 px-3 py-2 font-barlow text-[10px] font-extrabold uppercase text-accent-gold hover:bg-accent-gold/30 disabled:opacity-40"
              >
                {isDistributing ? "Speichert…" : "Verteilen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
