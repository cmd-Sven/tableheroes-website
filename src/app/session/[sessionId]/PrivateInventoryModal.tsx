"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Briefcase,
  Coins,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCharacterItem,
  getCampaignPartyCharacters,
  getCharacterEquipmentPayload,
  saveCharacterEquipment,
  transferContainerToCharacter,
  transferItemToCharacter,
  updateCharacterWealth,
  type CharacterEquipmentPayload,
  type PartyCharacterOption,
} from "@/src/lib/actions/character-inventory-actions";
import { distributeRations } from "@/src/lib/actions/downtime-actions";
import {
  type CharacterGem,
  type CharacterItem,
  type CharacterWealth,
} from "@/src/types/inventory";
import { CustomDnd5eItemEditorModal } from "@/src/components/characters/CustomDnd5eItemEditorModal";
import { InventoryGrid } from "@/src/components/characters/inventory/InventoryGrid";
import { DND_COIN_TYPES, type DndCoinCode } from "@/src/lib/dnd-currency";
import { DndCoinIcon, DndCoinWalletRow } from "@/src/components/currency/DndCoinDisplay";
import {
  canEquipItemAsContainer,
  normalizeEquipmentState,
  placeItemIntoBestContainer,
  removeItemFromEquipment,
} from "@/src/lib/characters/dnd5e/equipment";
import { inferContainerKind, isBackpackItem } from "@/src/lib/characters/dnd5e/item-resolve";
import { toast } from "sonner";
import type {
  Dnd5eEquipmentContainer,
  Dnd5eEquipmentState,
} from "@/src/lib/characters/dnd5e/equipment-types";
import {
  duplicateCharacterItem,
  setItemInventoryCategory,
  splitStack,
} from "@/src/lib/characters/dnd5e/inventory-item-ops";
import { CharacterSheetLocaleProvider } from "@/src/lib/i18n/character-sheet/context";
import { useCharacterSheetLocale } from "@/src/lib/i18n/character-sheet/context";

const COIN_FIELD_ORDER: DndCoinCode[] = ["pp", "gp", "ep", "sp", "cp"];

type ViewTab = "inventory" | "wealth";

type InventoryCharacter = {
  id: string;
  name: string;
  class: string | null;
  level: number | null;
  avatar_url: string | null;
};

const VIEW_TABS: Array<{ id: ViewTab; label: string; Icon: typeof Briefcase }> = [
  { id: "inventory", label: "Inventar", Icon: Briefcase },
  { id: "wealth", label: "Coins & Gems", Icon: Coins },
];

function currencyField(
  code: DndCoinCode,
  value: number,
  onChange: (value: number) => void,
) {
  const meta = DND_COIN_TYPES.find((row) => row.code === code);
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5">
        <DndCoinIcon code={code} size="sm" />
        <span className="sr-only">{meta?.name ?? code}</span>
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={meta?.name ?? code}
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

function SessionInventoryBody({
  character,
  initialPayload,
  onClose,
  gmRationsDistribution,
}: {
  character: InventoryCharacter;
  initialPayload: CharacterEquipmentPayload;
  onClose: () => void;
  gmRationsDistribution?: GmRationsDistributionProps;
}) {
  const { t } = useCharacterSheetLocale();
  const [activeTab, setActiveTab] = useState<ViewTab>("inventory");
  const [payload, setPayload] = useState<CharacterEquipmentPayload>(initialPayload);
  const [equipment, setEquipment] = useState<Dnd5eEquipmentState>(() =>
    normalizeEquipmentState(initialPayload.equipment),
  );
  const [wealthDraft, setWealthDraft] = useState<CharacterWealth>(() => initialPayload.wealth);
  const [itemEditor, setItemEditor] = useState<CharacterItem | null | "new">(null);
  const [partyCharacters, setPartyCharacters] = useState<PartyCharacterOption[]>([]);
  const [highlightItemIds, setHighlightItemIds] = useState<Set<string>>(() => new Set());
  const [activeInventoryContainerId, setActiveInventoryContainerId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSavingWealth, startSavingWealth] = useTransition();
  const [isSavingEquipment, startSavingEquipment] = useTransition();
  const [rationsModalOpen, setRationsModalOpen] = useState(false);
  const [rationsDraft, setRationsDraft] = useState<Record<string, number>>({});
  const [isDistributing, startDistributing] = useTransition();

  const reload = useCallback(async () => {
    const next = await getCharacterEquipmentPayload(character.id);
    setPayload(next);
    setEquipment(normalizeEquipmentState(next.equipment));
    setWealthDraft(next.wealth);
    return next;
  }, [character.id]);

  useEffect(() => {
    setPayload(initialPayload);
    setEquipment(normalizeEquipmentState(initialPayload.equipment));
    setWealthDraft(initialPayload.wealth);
    void getCampaignPartyCharacters(initialPayload.campaignId, character.id)
      .then(setPartyCharacters)
      .catch(() => setPartyCharacters([]));
  }, [initialPayload, character.id]);

  const items = useMemo(
    () => (payload?.items ?? []).filter((item) => !item.is_deleted),
    [payload?.items],
  );

  const gemTotal = wealthDraft.gem_data.reduce(
    (sum, gem) => sum + Math.max(0, Number(gem.estimated_value) || 0),
    0,
  );

  function persistEquipment(next: Dnd5eEquipmentState) {
    const normalized = normalizeEquipmentState(next);
    setEquipment(normalized);
    startSavingEquipment(async () => {
      try {
        await saveCharacterEquipment(character.id, normalized);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ausrüstung konnte nicht gespeichert werden.",
        );
      }
    });
  }

  function addContainer(container: Dnd5eEquipmentContainer) {
    if (container.linkedItemId) {
      const gate = canEquipItemAsContainer(equipment, container.linkedItemId);
      if (!gate.ok) {
        toast.error(
          gate.reason === "not_empty"
            ? "Nur leeres Gepäck kann als Behälter ausgerüstet werden."
            : "Dieses Gepäck ist bereits als Behälter ausgerüstet.",
        );
        return;
      }
    }
    let next = normalizeEquipmentState(equipment);
    if (container.linkedItemId) {
      next = removeItemFromEquipment(next, container.linkedItemId);
    }
    persistEquipment({ ...next, containers: [...next.containers, container] });
    if (container.id) setActiveInventoryContainerId(container.id);
  }

  function updateContainer(container: Dnd5eEquipmentContainer) {
    persistEquipment({
      ...equipment,
      containers: equipment.containers.map((c) => (c.id === container.id ? container : c)),
    });
  }

  function equipItemAsContainer(item: CharacterItem) {
    if (!(isBackpackItem(item) || inferContainerKind(item) != null)) {
      toast.error("Nur Gepäck-/Rucksack-Gegenstände können hier ausgerüstet werden.");
      return;
    }
    const gate = canEquipItemAsContainer(equipment, item.id);
    if (!gate.ok) {
      toast.error(
        gate.reason === "not_empty"
          ? "Nur leeres Gepäck kann als Behälter ausgerüstet werden."
          : "Dieses Gepäck ist bereits als Behälter ausgerüstet.",
      );
      return;
    }
    const kind = inferContainerKind(item) ?? "backpack";
    addContainer({
      id: crypto.randomUUID(),
      kind,
      label: item.name,
      linkedItemId: item.id,
      itemIds: [],
    });
  }

  async function placeNewItemInInventory(saved: CharacterItem) {
    setHighlightItemIds((prev) => new Set([...prev, saved.id]));
    const nextPayload = await getCharacterEquipmentPayload(character.id);
    setPayload(nextPayload);
    // Equipment aus dem Server nicht überschreiben — lokale Placement-Änderungen behalten
    const allItems = (nextPayload.items ?? []).filter((i) => !i.is_deleted);
    if (!allItems.some((i) => i.id === saved.id)) {
      allItems.push(saved);
    }

    const prefer =
      activeInventoryContainerId && activeInventoryContainerId !== "__unassigned__"
        ? activeInventoryContainerId
        : equipment.containers[0]?.id ?? null;

    if (!prefer && equipment.containers.length === 0) {
      setActiveInventoryContainerId("__unassigned__");
      return;
    }

    const next = placeItemIntoBestContainer(equipment, allItems, saved.id, prefer);
    persistEquipment(next);
    const landedIn =
      next.containers.find((c) => c.itemIds.includes(saved.id))?.id ??
      prefer ??
      "__unassigned__";
    setActiveInventoryContainerId(landedIn);
  }

  async function handleGiveItem(item: CharacterItem, targetCharacterId: string) {
    await transferItemToCharacter({
      itemId: item.id,
      fromCharacterId: character.id,
      toCharacterId: targetCharacterId,
    });
    persistEquipment(removeItemFromEquipment(equipment, item.id));
    await reload();
  }

  async function handleTransferContainer(
    containerId: string,
    targetCharacterId: string,
    currentEquipment: Dnd5eEquipmentState,
  ) {
    await transferContainerToCharacter({
      fromCharacterId: character.id,
      toCharacterId: targetCharacterId,
      containerId,
      sourceEquipment: currentEquipment,
    });
    persistEquipment({
      ...currentEquipment,
      containers: currentEquipment.containers.filter((c) => c.id !== containerId),
    });
  }

  function addCustomCategory(label: string) {
    persistEquipment({
      ...equipment,
      customCategories: [
        ...(equipment.customCategories ?? []),
        { id: crypto.randomUUID(), label },
      ],
    });
  }

  async function handleDeleteItem(item: CharacterItem) {
    await deleteCharacterItem(item.id);
    persistEquipment(removeItemFromEquipment(equipment, item.id));
    await reload();
  }

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
          await reload();
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
            {VIEW_TABS.map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;
              const visual =
                tab.id === "wealth"
                  ? "bg-yellow-950 text-yellow-200 shadow-[0_0_18px_rgba(202,138,4,0.55)]"
                  : "bg-emerald-950 text-emerald-200 shadow-[0_0_18px_rgba(6,78,59,0.55)]";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`grid h-12 w-12 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-gold ${visual} ${
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
            })}
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
            <div className="mb-2 shrink-0 text-center">
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
              <p className="mb-2 rounded bg-red-950/70 px-3 py-2 font-libre text-xs text-red-100">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              {activeTab === "wealth" ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-black/25 p-3">
                    <h3 className="mb-2 font-barlow text-xs font-bold uppercase text-accent-gold">
                      Münzbeutel
                    </h3>
                    <DndCoinWalletRow pouch={wealthDraft} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {COIN_FIELD_ORDER.map((code) =>
                      currencyField(code, wealthDraft[code], (next) =>
                        setWealthDraft((current) => ({ ...current, [code]: next })),
                      ),
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
                          <div className="relative">
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
                              aria-label="Geschätzter Wert in Goldmünzen"
                              className="w-full rounded bg-black/35 py-1.5 pl-2 pr-7 font-barlow text-xs font-bold text-white outline-none focus:bg-black/55"
                            />
                            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
                              <DndCoinIcon code="gp" size="xs" />
                            </span>
                          </div>
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
                      <span className="inline-flex items-center gap-1 font-barlow text-base font-extrabold text-accent-gold">
                        {gemTotal.toLocaleString("de-DE")}
                        <DndCoinIcon code="gp" size="sm" />
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
                <InventoryGrid
                  variant="session"
                  items={items}
                  equipment={equipment}
                  readOnly={false}
                  highlightItemIds={highlightItemIds}
                  partyCharacters={partyCharacters}
                  onEquipmentChange={persistEquipment}
                  activeContainerId={activeInventoryContainerId}
                  onActiveContainerIdChange={setActiveInventoryContainerId}
                  onAddItem={() => setItemEditor("new")}
                  onEditItem={(item) => setItemEditor(item)}
                  onDeleteItem={handleDeleteItem}
                  onDuplicateItem={async (item) => {
                    const dup = await duplicateCharacterItem(item);
                    await placeNewItemInInventory(dup);
                  }}
                  onSplitStack={async (item, amount) => {
                    const result = await splitStack(item, amount);
                    await placeNewItemInInventory(result.split);
                  }}
                  onAssignCategory={async (item, category) => {
                    await setItemInventoryCategory(item, category);
                    await reload();
                  }}
                  onGiveItem={handleGiveItem}
                  onTransferContainer={handleTransferContainer}
                  onAddContainer={addContainer}
                  onUpdateContainer={updateContainer}
                  onAddCustomCategory={addCustomCategory}
                  onEquipAsContainer={equipItemAsContainer}
                />
              )}
            </div>

            {isSavingEquipment ? (
              <p className="mt-1 text-center font-libre text-[9px] text-slate-400">
                Ausrüstung wird gespeichert…
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {itemEditor !== null ? (
        <CustomDnd5eItemEditorModal
          characterId={character.id}
          item={itemEditor === "new" ? null : itemEditor}
          onClose={() => setItemEditor(null)}
          onSaved={async (saved) => {
            setItemEditor(null);
            await placeNewItemInInventory(saved);
          }}
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

export function PrivateInventoryModal({
  character,
  onClose,
  gmRationsDistribution,
}: {
  character: InventoryCharacter;
  onClose: () => void;
  gmRationsDistribution?: GmRationsDistributionProps;
}) {
  const [bootstrap, setBootstrap] = useState<CharacterEquipmentPayload | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCharacterEquipmentPayload(character.id)
      .then((payload) => {
        if (!cancelled) setBootstrap(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setBootstrapError(
            err instanceof Error ? err.message : "Inventar konnte nicht geladen werden.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [character.id]);

  if (bootstrapError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
        <div className="rounded-xl border border-red-900/60 bg-background-card p-6 text-center">
          <p className="font-libre text-sm text-red-200">{bootstrapError}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded border border-gray-600 px-4 py-2 font-barlow text-xs uppercase text-gray-300"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  if (!bootstrap) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
        <p className="font-libre text-sm text-slate-200">Inventar wird geladen…</p>
      </div>
    );
  }

  return (
    <CharacterSheetLocaleProvider
      campaignId={bootstrap.campaignId}
      characterId={character.id}
      initialLocale={bootstrap.sheetLocale}
    >
      <SessionInventoryBody
        character={character}
        initialPayload={bootstrap}
        onClose={onClose}
        gmRationsDistribution={gmRationsDistribution}
      />
    </CharacterSheetLocaleProvider>
  );
}
