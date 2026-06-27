"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createCampaignSceneMedia,
  deleteCampaignSceneMedia,
  updateCampaignSceneMedia,
} from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { updateSessionStageDeck } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { EntityImageRightsFields } from "@/src/components/ui/EntityImageRightsFields";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";
import type { CampaignSceneMedia } from "@/src/lib/scene-media-types";
import { SCENE_MEDIA_CATEGORIES } from "@/src/lib/scene-media-types";
import { uploadSceneMediaImage, PROFILE_MEDIA_ACCEPT_MIME } from "@/src/lib/profile-media";

type Props = {
  campaignId: string;
  sessionId: string;
  initialItems: CampaignSceneMedia[];
  stageDeckSceneMediaIds: string[] | null;
  onRefresh: () => void;
};

export function StagePrepSceneMedia({
  campaignId,
  sessionId,
  initialItems,
  stageDeckSceneMediaIds,
  onRefresh,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [categoryFilter, setCategoryFilter] = useState<string>("alle");
  const [deckAll, setDeckAll] = useState(stageDeckSceneMediaIds == null);
  const [deckPick, setDeckPick] = useState<Set<string>>(
    () =>
      new Set(
        stageDeckSceneMediaIds?.length
          ? stageDeckSceneMediaIds
          : initialItems.map((i) => i.id),
      ),
  );
  const [isPending, startTransition] = useTransition();

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("Sonstiges");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [uploadRightsConfirmed, setUploadRightsConfirmed] = useState(false);
  const [newGmNotes, setNewGmNotes] = useState("");
  const [newPlayerNotes, setNewPlayerNotes] = useState("");

  const filtered = useMemo(() => {
    if (categoryFilter === "alle") return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  function resetNewForm() {
    setNewTitle("");
    setNewCategory("Sonstiges");
    setNewFile(null);
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPreview(null);
    setIsAiGenerated(false);
    setUploadRightsConfirmed(false);
    setNewGmNotes("");
    setNewPlayerNotes("");
  }

  function handleAdd() {
    if (!newTitle.trim()) {
      toast.error("Bitte einen Titel für die Szene angeben.");
      return;
    }
    if (!newFile) {
      toast.error("Bitte ein Bild hochladen.");
      return;
    }
    if (!isAiGenerated && !uploadRightsConfirmed) {
      toast.error("Bitte KI-Kennzeichnung oder Nutzungsrechte bestätigen.");
      return;
    }

    startTransition(async () => {
      try {
        const upload = await uploadSceneMediaImage(newFile, { campaignId });
        if ("error" in upload) throw new Error(upload.error);

        const created = await createCampaignSceneMedia({
          campaignId,
          title: newTitle.trim(),
          imageUrl: upload.publicUrl,
          imageStoragePath: upload.path,
          category: newCategory,
          gmNotes: newGmNotes,
          playerNotes: newPlayerNotes,
          imageIsAiGenerated: isAiGenerated,
          imageUploadRightsConfirmed: isAiGenerated ? null : true,
          sortOrder: items.length,
        });

        setItems((prev) => [...prev, created]);
        if (!deckAll) setDeckPick((prev) => new Set([...prev, created.id]));
        resetNewForm();
        toast.success("Szenenbild zur Mediathek hinzugefügt.");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
      }
    });
  }

  function saveDeck() {
    startTransition(async () => {
      try {
        await updateSessionStageDeck(sessionId, {
          stage_deck_scene_media_ids: deckAll ? null : Array.from(deckPick),
        });
        toast.success("Szenen-Deck gespeichert.");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  return (
    <section className="rounded-xl border border-hero-border p-5 space-y-5" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div>
        <h2 className="font-cinzel text-xl text-hero-vibrant">Szenen-Mediathek</h2>
        <p className="mt-1 text-sm text-gray-400 font-libre">
          KI-Szenenbilder hochladen, kategorisieren und fürs Live-Deck vormerken. Die Mediathek
          bleibt kampagnenweit erhalten.
        </p>
      </div>

      <div className="rounded-lg border border-hero-border/60 bg-black/25 p-4 space-y-3">
        <h3 className="font-barlow text-xs font-bold uppercase text-accent-gold">Neues Szenenbild</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titel der Szene"
            className="rounded border border-hero-border bg-slate-900/80 px-3 py-2 text-sm text-white"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded border border-hero-border bg-slate-900/80 px-3 py-2 text-sm text-white"
          >
            {SCENE_MEDIA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input
          type="file"
          accept={PROFILE_MEDIA_ACCEPT_MIME.join(",")}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            e.target.value = "";
            if (newPreview) URL.revokeObjectURL(newPreview);
            setNewFile(file);
            setNewPreview(file ? URL.createObjectURL(file) : null);
            setUploadRightsConfirmed(false);
            setIsAiGenerated(false);
          }}
          className="block w-full text-sm text-gray-300"
        />
        {newPreview ? (
          <div className="relative aspect-video max-w-md overflow-hidden rounded-lg border border-hero-border">
            <Image src={newPreview} alt="" fill unoptimized className="object-cover" />
          </div>
        ) : null}
        {newFile ? (
          <>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={isAiGenerated}
                onChange={(e) => {
                  setIsAiGenerated(e.target.checked);
                  if (e.target.checked) setUploadRightsConfirmed(false);
                }}
                className="h-4 w-4 rounded border-hero-border accent-accent-gold"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-accent-gold/80" />
                Bild ist KI-generiert (Nutzungsrechte bei Table Heroes)
              </span>
            </label>
            {!isAiGenerated ? (
              <EntityImageRightsFields
                mode="upload"
                isAiGenerated={false}
                onIsAiGeneratedChange={() => {}}
                uploadRightsConfirmed={uploadRightsConfirmed}
                onUploadRightsConfirmedChange={setUploadRightsConfirmed}
                urlRightsConfirmed={false}
                onUrlRightsConfirmedChange={() => {}}
                showPublicHint={false}
              />
            ) : null}
          </>
        ) : null}
        {isAiGenerated ? <NpcPortraitAttribution isAiGenerated className="justify-start" /> : null}
        <textarea
          value={newGmNotes}
          onChange={(e) => setNewGmNotes(e.target.value)}
          rows={2}
          placeholder="GM-Notizen zur Szene (nur für dich)"
          className="w-full rounded border border-hero-border bg-slate-900/80 px-3 py-2 text-sm text-white"
        />
        <textarea
          value={newPlayerNotes}
          onChange={(e) => setNewPlayerNotes(e.target.value)}
          rows={2}
          placeholder="Spieler-Notizen (sichtbar für die Gruppe)"
          className="w-full rounded border border-hero-border bg-slate-900/80 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdd}
          className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 text-sm font-barlow font-bold uppercase text-accent-gold disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Zur Mediathek hinzufügen
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("alle")}
          className={`rounded px-2 py-1 text-xs font-barlow uppercase ${
            categoryFilter === "alle" ? "bg-accent-gold/20 text-accent-gold" : "text-gray-400"
          }`}
        >
          Alle
        </button>
        {SCENE_MEDIA_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoryFilter(c)}
            className={`rounded px-2 py-1 text-xs font-barlow uppercase ${
              categoryFilter === c ? "bg-accent-gold/20 text-accent-gold" : "text-gray-400"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 font-libre italic">Noch keine Szenenbilder in dieser Kategorie.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <SceneMediaCard
              key={item.id}
              item={item}
              campaignId={campaignId}
              deckAll={deckAll}
              inDeck={deckAll || deckPick.has(item.id)}
              onToggleDeck={(checked) => {
                if (deckAll) return;
                setDeckPick((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(item.id);
                  else next.delete(item.id);
                  return next;
                });
              }}
              onUpdated={(updated) =>
                setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
              }
              onDeleted={() => {
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                setDeckPick((prev) => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border border-hero-border/50 bg-black/20 p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={deckAll}
            onChange={(e) => {
              setDeckAll(e.target.checked);
              if (e.target.checked) setDeckPick(new Set(items.map((i) => i.id)));
            }}
          />
          Alle Szenenbilder im Live-Deck
        </label>
        {!deckAll ? (
          <p className="text-xs text-gray-500">
            Aktiviere pro Karte oben „Im Deck“, welche Szenen in der Live-Session griffbereit sind.
          </p>
        ) : null}
        <button
          type="button"
          disabled={isPending}
          onClick={saveDeck}
          className="inline-flex items-center gap-2 rounded border border-hero-vibrant px-3 py-1.5 text-xs font-barlow font-bold uppercase text-hero-vibrant disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Szenen-Deck speichern
        </button>
      </div>
    </section>
  );
}

function SceneMediaCard({
  item,
  campaignId,
  deckAll,
  inDeck,
  onToggleDeck,
  onUpdated,
  onDeleted,
}: {
  item: CampaignSceneMedia;
  campaignId: string;
  deckAll: boolean;
  inDeck: boolean;
  onToggleDeck: (checked: boolean) => void;
  onUpdated: (item: CampaignSceneMedia) => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [gmNotes, setGmNotes] = useState(item.gm_notes ?? "");
  const [playerNotes, setPlayerNotes] = useState(item.player_notes ?? "");

  return (
    <article className="rounded-lg border border-hero-border/60 bg-slate-900/40 overflow-hidden">
      <div className="relative aspect-video bg-black/40">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.title} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-600" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] uppercase text-accent-gold">
          {item.category}
        </span>
        {item.image_is_ai_generated ? (
          <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-gray-300 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> KI
          </span>
        ) : null}
      </div>
      <div className="p-3 space-y-2">
        <p className="font-cinzel text-sm text-white">{item.title}</p>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={inDeck}
            disabled={deckAll}
            onChange={(e) => onToggleDeck(e.target.checked)}
          />
          Im Live-Deck
        </label>
        <textarea
          value={gmNotes}
          onChange={(e) => setGmNotes(e.target.value)}
          rows={2}
          placeholder="GM-Notizen"
          className="w-full rounded border border-hero-border/40 bg-black/30 px-2 py-1 text-xs text-gray-300"
        />
        <textarea
          value={playerNotes}
          onChange={(e) => setPlayerNotes(e.target.value)}
          rows={2}
          placeholder="Spieler-Notizen"
          className="w-full rounded border border-hero-border/40 bg-black/30 px-2 py-1 text-xs text-gray-300"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                try {
                  await updateCampaignSceneMedia(item.id, campaignId, {
                    gmNotes,
                    playerNotes,
                  });
                  onUpdated({ ...item, gm_notes: gmNotes, player_notes: playerNotes });
                  toast.success("Notizen gespeichert.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Fehler");
                }
              });
            }}
            className="text-xs text-hero-vibrant hover:underline"
          >
            Notizen speichern
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`„${item.title}" wirklich löschen?`)) return;
              startTransition(async () => {
                try {
                  await deleteCampaignSceneMedia(item.id, campaignId);
                  onDeleted();
                  toast.success("Szenenbild gelöscht.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Fehler");
                }
              });
            }}
            className="ml-auto text-xs text-red-400 hover:underline inline-flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Löschen
          </button>
        </div>
      </div>
    </article>
  );
}
