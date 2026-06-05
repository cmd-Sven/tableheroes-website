"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Save, Skull, Star, Trash2, X } from "lucide-react";
import { goldFieldToCopper } from "@/src/lib/dnd-currency";
import { DndCoinDisplay } from "@/src/components/currency/DndCoinDisplay";
import {
  deleteCampaignShopItem,
  upsertCampaignShopItem,
  type CampaignShopItemInput,
} from "@/src/app/dashboard/campaigns/[id]/shop-actions";
import type { CampaignShopItemRow } from "@/src/app/dashboard/campaigns/[id]/shop-queries";

type Props = {
  campaignId: string;
  shopId: string;
  initialItems: CampaignShopItemRow[];
};

type ShopItemFormState = {
  id?: string;
  name: string;
  description: string;
  base_price_gp: number;
  is_magical: boolean;
  is_legal: boolean;
  rarity: CampaignShopItemInput["rarity"];
  item_type: CampaignShopItemInput["item_type"];
  target_fap: number;
  is_ration_package: boolean;
};

const RARITY_OPTIONS = [
  "common",
  "uncommon",
  "rare",
  "very rare",
  "legendary",
] as const;

const ITEM_TYPE_OPTIONS = [
  "weapon",
  "armor",
  "potion",
  "gear",
  "material",
  "service",
  "quest",
] as const;

const EMPTY_FORM: ShopItemFormState = {
  name: "",
  description: "",
  base_price_gp: 10,
  is_magical: false,
  is_legal: true,
  rarity: "common",
  item_type: "gear",
  target_fap: 0,
  is_ration_package: false,
};

function rowToForm(row: CampaignShopItemRow): ShopItemFormState {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    base_price_gp: row.base_price_gp,
    is_magical: row.is_magical,
    is_legal: row.is_legal,
    rarity: (RARITY_OPTIONS.includes(row.rarity as (typeof RARITY_OPTIONS)[number])
      ? row.rarity
      : "common") as ShopItemFormState["rarity"],
    item_type: (ITEM_TYPE_OPTIONS.includes(row.item_type as (typeof ITEM_TYPE_OPTIONS)[number])
      ? row.item_type
      : "gear") as ShopItemFormState["item_type"],
    target_fap: row.target_fap,
    is_ration_package: row.is_ration_package,
  };
}

function ItemFormFields({
  form,
  onChange,
  idPrefix,
}: {
  form: ShopItemFormState;
  onChange: (patch: Partial<ShopItemFormState>) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          required
          className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow text-white outline-none focus:border-hero-vibrant"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-desc`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
          Beschreibung
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          rows={3}
          className="w-full resize-none rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white outline-none focus:border-hero-vibrant"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-price`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
            Preis (GM, D&amp;D 5e)
          </label>
          <input
            id={`${idPrefix}-price`}
            type="number"
            min={0}
            value={form.base_price_gp}
            onChange={(event) =>
              onChange({
                base_price_gp: Math.max(0, Math.round(Number(event.target.value) || 0)),
              })
            }
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-accent-gold"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-fap`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
            FAP-Ziel
          </label>
          <input
            id={`${idPrefix}-fap`}
            type="number"
            min={0}
            value={form.target_fap}
            onChange={(event) =>
              onChange({
                target_fap: Math.max(0, Math.round(Number(event.target.value) || 0)),
              })
            }
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-rarity`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
            Seltenheit
          </label>
          <select
            id={`${idPrefix}-rarity`}
            value={form.rarity}
            onChange={(event) =>
              onChange({ rarity: event.target.value as ShopItemFormState["rarity"] })
            }
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
          >
            {RARITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-type`} className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400">
            Typ
          </label>
          <select
            id={`${idPrefix}-type`}
            value={form.item_type}
            onChange={(event) =>
              onChange({ item_type: event.target.value as ShopItemFormState["item_type"] })
            }
            className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
          >
            {ITEM_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 font-libre text-sm text-gray-200">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_magical}
            onChange={(event) => onChange({ is_magical: event.target.checked })}
            className="rounded border-hero-dark bg-slate-800 text-accent-gold focus:ring-accent-gold"
          />
          Magisch
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_legal}
            onChange={(event) => onChange({ is_legal: event.target.checked })}
            className="rounded border-hero-dark bg-slate-800 text-emerald-400 focus:ring-emerald-400"
          />
          Legal
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_ration_package}
            onChange={(event) => onChange({ is_ration_package: event.target.checked })}
            className="rounded border-hero-dark bg-slate-800 text-hero-vibrant focus:ring-hero-vibrant"
          />
          Proviant (+2 Rationen)
        </label>
      </div>
    </div>
  );
}

export function UniqueShopItemEditor({ campaignId, shopId, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ShopItemFormState | null>(null);
  const [newForm, setNewForm] = useState<ShopItemFormState>(EMPTY_FORM);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const beginEdit = (row: CampaignShopItemRow) => {
    setEditingId(row.id);
    setEditForm(rowToForm(row));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveItem = (form: ShopItemFormState, onSuccess: () => void) => {
    const name = form.name.trim();
    if (!name) {
      setError("Bitte einen Namen angeben.");
      return;
    }

    setError(null);
    startSaveTransition(async () => {
      const payload: CampaignShopItemInput = {
        id: form.id,
        name,
        description: form.description.trim() || null,
        base_price_gp: form.base_price_gp,
        is_magical: form.is_magical,
        is_legal: form.is_legal,
        rarity: form.rarity,
        item_type: form.item_type,
        target_fap: form.target_fap,
        is_ration_package: form.is_ration_package,
      };

      const result = await upsertCampaignShopItem(campaignId, shopId, payload);
      if (!result.success) {
        setError(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      const nextRow: CampaignShopItemRow = {
        id: result.itemId ?? form.id ?? crypto.randomUUID(),
        shop_id: shopId,
        sort_order: form.id ? (items.find((item) => item.id === form.id)?.sort_order ?? 0) : items.length,
        name,
        description: payload.description ?? null,
        base_price_gp: payload.base_price_gp,
        is_magical: Boolean(payload.is_magical),
        is_legal: payload.is_legal !== false,
        rarity: String(payload.rarity ?? "common"),
        item_type: String(payload.item_type ?? "gear"),
        target_fap: Math.max(0, Math.round(Number(payload.target_fap ?? 0))),
        is_ration_package: Boolean(payload.is_ration_package),
      };

      setItems((current) => {
        if (form.id) {
          return current.map((item) => (item.id === form.id ? nextRow : item));
        }
        return [...current, nextRow];
      });
      onSuccess();
    });
  };

  const handleDelete = (itemId: string) => {
    if (!window.confirm("Dieses Item wirklich löschen?")) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteCampaignShopItem(campaignId, shopId, itemId);
      if (!result.success) {
        setError(result.error ?? "Löschen fehlgeschlagen.");
        return;
      }
      setItems((current) => current.filter((item) => item.id !== itemId));
      if (editingId === itemId) cancelEdit();
    });
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded border border-red-500/50 bg-red-950/40 p-3 font-libre text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-libre text-sm text-gray-300">
          {items.length} {items.length === 1 ? "Position" : "Positionen"} im Katalog
        </p>
        <button
          type="button"
          onClick={() => {
            setShowNewForm((value) => !value);
            setNewForm(EMPTY_FORM);
            setError(null);
          }}
          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow text-xs font-bold uppercase text-accent-gold transition-colors hover:bg-accent-gold hover:text-black"
        >
          {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showNewForm ? "Abbrechen" : "Neues Item"}
        </button>
      </div>

      {showNewForm ? (
        <div className="rounded-lg border border-accent-gold/30 bg-slate-950/50 p-5">
          <h3 className="mb-4 font-barlow text-lg font-bold uppercase text-accent-gold">
            Neues Item anlegen
          </h3>
          <ItemFormFields form={newForm} onChange={(patch) => setNewForm((current) => ({ ...current, ...patch }))} idPrefix="new" />
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              saveItem(newForm, () => {
                setShowNewForm(false);
                setNewForm(EMPTY_FORM);
              })
            }
            className="mt-4 inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow text-sm font-bold uppercase text-white transition-colors hover:bg-hero-vibrant disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Item speichern
          </button>
        </div>
      ) : null}

      {items.length === 0 && !showNewForm ? (
        <div className="rounded-lg border border-dashed border-hero-border/50 bg-slate-950/40 p-8 text-center">
          <p className="font-libre text-gray-300">
            Noch keine Waren. Lege das erste Item an oder nutze den KI-Generator auf der Shop-Übersicht.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const isEditing = editingId === item.id && editForm;

          return (
            <article
              key={item.id}
              className="rounded-lg border border-hero-dark bg-slate-950/60 p-4"
            >
              {isEditing && editForm ? (
                <>
                  <ItemFormFields
                    form={editForm}
                    onChange={(patch) => setEditForm((current) => (current ? { ...current, ...patch } : current))}
                    idPrefix={`edit-${item.id}`}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => saveItem(editForm, cancelEdit)}
                      className="inline-flex items-center gap-2 rounded border border-hero-border bg-hero-dark px-3 py-2 font-barlow text-xs font-bold uppercase text-white hover:bg-hero-vibrant disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex items-center gap-2 rounded border border-hero-border/50 px-3 py-2 font-barlow text-xs font-bold uppercase text-gray-300 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                      Abbrechen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h4 className="font-barlow text-lg font-bold uppercase text-white">{item.name}</h4>
                      {item.description ? (
                        <p className="mt-1 font-libre text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DndCoinDisplay totalCp={goldFieldToCopper(item.base_price_gp)} size="sm" />
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        className="rounded border border-hero-border/50 p-2 text-gray-300 hover:border-accent-gold hover:text-accent-gold"
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(item.id)}
                        className="rounded border border-red-500/40 p-2 text-red-300 hover:bg-red-950/40"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-hero-border/50 bg-background-dark px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-300">
                      {item.rarity}
                    </span>
                    <span className="rounded-full border border-hero-border/50 bg-background-dark px-2 py-1 font-barlow text-[10px] font-bold uppercase text-gray-300">
                      {item.item_type}
                    </span>
                    {item.target_fap > 0 ? (
                      <span className="rounded-full border border-hero-vibrant/40 bg-hero-vibrant/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
                        FAP {item.target_fap}
                      </span>
                    ) : null}
                    {item.is_ration_package ? (
                      <span className="rounded-full border border-hero-vibrant/50 bg-hero-vibrant/15 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-hero-vibrant">
                        Proviant +2
                      </span>
                    ) : null}
                    {item.is_magical ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent-gold/60 bg-accent-gold/15 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold">
                        <Star className="h-3 w-3" />
                        Magisch
                      </span>
                    ) : null}
                    {!item.is_legal ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/60 bg-red-950/50 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-red-200">
                        <Skull className="h-3 w-3" />
                        Illegal
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
