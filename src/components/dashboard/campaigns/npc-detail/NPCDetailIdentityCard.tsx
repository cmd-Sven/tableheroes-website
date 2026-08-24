/**
 * Portrait and identity fields (name, role, faction, location, last seen).
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";
import { NpcPortraitUploadField } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitUploadField";
import { NpcPortraitAttribution } from "@/src/components/dashboard/campaigns/npcs/NpcPortraitAttribution";
import { NpcSceneAppearances } from "@/src/components/dashboard/campaigns/npcs/NpcSceneAppearances";
import { InlineEditField } from "./InlineEditField";
import { TravelQuickAction } from "./TravelQuickAction";
import { ALIGNMENTS, NPC_STATUSES } from "./types";
import { getAlignmentColor } from "./getAlignmentColor";
import type { NPCDetailController } from "./useNPCDetailPage";

export function NPCDetailIdentityCard({ c }: { c: NPCDetailController }) {
  const {
    npc,
    campaignId,
    canEdit,
    isGM,
    isPending,
    editingField,
    editValues,
    setEditValues,
    imageDisplayEdit,
    setImageDisplayEdit,
    portraitFile,
    setPortraitFile,
    uploadRightsConfirmed,
    setUploadRightsConfirmed,
    portraitIsAiGenerated,
    setPortraitIsAiGenerated,
    urlRightsConfirmed,
    setUrlRightsConfirmed,
    factions,
    locations,
    lastSeen,
    sceneAppearances,
    handleStartEdit,
    handleSaveField,
    handleCancelEdit,
    router,
  } = c;

  return (
    <>
      {/* NPC Header Card with Image */}
      <div className="rounded-lg border border-hero-border bg-background-card p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Image - Portrait Format (Editable) */}
          <div className="shrink-0">
            <InlineEditField
              isEditing={editingField === "image_url"}
              onEdit={() => handleStartEdit("image_url", npc.image_url)}
              onSave={() => handleSaveField("image_url")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <div className="max-w-md rounded-xl border-2 border-hero-border bg-hero-dark/50 p-4">
                  <NpcPortraitUploadField
                    imageUrl={editValues.image_url || npc.image_url || ""}
                    portraitFile={portraitFile}
                    onPortraitFileChange={(file) => {
                      setPortraitFile(file);
                      if (file) {
                        setUploadRightsConfirmed(false);
                        setPortraitIsAiGenerated(false);
                        setUrlRightsConfirmed(false);
                      }
                    }}
                    imageDisplay={imageDisplayEdit ?? normalizeImageDisplay(npc.image_display)}
                    onImageDisplayChange={setImageDisplayEdit}
                    isAiGenerated={portraitIsAiGenerated}
                    onIsAiGeneratedChange={setPortraitIsAiGenerated}
                    uploadRightsConfirmed={uploadRightsConfirmed}
                    onUploadRightsConfirmedChange={setUploadRightsConfirmed}
                    urlRightsConfirmed={urlRightsConfirmed}
                    onUrlRightsConfirmedChange={setUrlRightsConfirmed}
                    onClearImage={() => {
                      setPortraitFile(null);
                      setUploadRightsConfirmed(false);
                      setPortraitIsAiGenerated(false);
                      setUrlRightsConfirmed(false);
                      setEditValues({ image_url: "" });
                      setImageDisplayEdit(normalizeImageDisplay(null));
                    }}
                    previewAspectClassName="aspect-[3/4] w-48 lg:w-56"
                  />
                </div>
              }
            >
              <div className="space-y-1">
                {npc.image_url ? (
                  <div
                    className="relative w-48 h-64 lg:w-56 lg:h-72 rounded-xl overflow-hidden border-2 border-hero-border shadow-lg"
                    style={imageDisplayBackdropStyle(normalizeImageDisplay(npc.image_display))}
                  >
                    <Image
                      src={npc.image_url}
                      alt={npc.name}
                      fill
                      className="select-none"
                      style={imageDisplayObjectStyle(normalizeImageDisplay(npc.image_display))}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-48 h-64 lg:w-56 lg:h-72 rounded-xl border-2 border-hero-border bg-hero-dark/50 flex items-center justify-center shadow-lg">
                    <User className="h-24 w-24 text-gray-500" />
                  </div>
                )}
                <NpcPortraitAttribution
                  isAiGenerated={npc.image_is_ai_generated}
                  className="w-48 lg:w-56"
                />
              </div>
            </InlineEditField>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <InlineEditField
              isEditing={editingField === "name"}
              onEdit={() => handleStartEdit("name", npc.name)}
              onSave={() => handleSaveField("name")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <input
                  type="text"
                  value={editValues.name || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, name: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-3 font-cinzel font-bold text-2xl text-hero-vibrant outline-none focus:border-hero-vibrant"
                  autoFocus
                />
              }
            >
              <h1 className="font-cinzel font-bold text-3xl text-hero-vibrant">
                {npc.name}
              </h1>
            </InlineEditField>

            {/* Title */}
            {npc.title || editingField === "title" ? (
              <InlineEditField
                isEditing={editingField === "title"}
                onEdit={() => handleStartEdit("title", npc.title)}
                onSave={() => handleSaveField("title")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.title || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, title: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-semibold text-xl text-accent-gold outline-none focus:border-hero-vibrant"
                    placeholder="Titel (optional)"
                  />
                }
              >
                <p className="font-barlow font-semibold text-xl text-accent-gold">
                  {npc.title}
                </p>
              </InlineEditField>
            ) : canEdit ? (
              <button
                onClick={() => handleStartEdit("title", null)}
                className="text-gray-500 hover:text-accent-gold text-sm font-barlow italic"
              >
                + Titel hinzufügen
              </button>
            ) : null}

            {/* Role */}
            {npc.role || editingField === "role" ? (
              <InlineEditField
                isEditing={editingField === "role"}
                onEdit={() => handleStartEdit("role", npc.role)}
                onSave={() => handleSaveField("role")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.role || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, role: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-gray-200 italic outline-none focus:border-hero-vibrant"
                    placeholder="Rolle (optional)"
                  />
                }
              >
                <p className="font-libre text-gray-400 italic">{npc.role}</p>
              </InlineEditField>
            ) : canEdit ? (
              <button
                onClick={() => handleStartEdit("role", null)}
                className="text-gray-500 hover:text-gray-400 text-sm font-libre italic"
              >
                + Rolle hinzufügen
              </button>
            ) : null}

            {/* Race */}
            <div className="flex items-center gap-4 flex-wrap">
              <InlineEditField
                isEditing={editingField === "race"}
                onEdit={() => handleStartEdit("race", npc.race)}
                onSave={() => handleSaveField("race")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <input
                    type="text"
                    value={editValues.race || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, race: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-gray-200 outline-none focus:border-hero-vibrant"
                    placeholder="Rasse"
                  />
                }
              >
                <p className="font-libre text-gray-400">
                  <span className="text-gray-500">Rasse:</span>{" "}
                  {npc.race || "Nicht angegeben"}
                </p>
              </InlineEditField>

              {/* Status */}
              <InlineEditField
                isEditing={editingField === "status"}
                onEdit={() => handleStartEdit("status", npc.status)}
                onSave={() => handleSaveField("status")}
                onCancel={handleCancelEdit}
                canEdit={canEdit}
                isPending={isPending}
                editComponent={
                  <select
                    value={editValues.status || ""}
                    onChange={(e) =>
                      setEditValues({ ...editValues, status: e.target.value })
                    }
                    className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                  >
                    {NPC_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                }
              >
                {npc.status && (
                  <span
                    className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${
                      npc.status === "Alive"
                        ? "bg-green-900/50 text-green-300 border-green-700"
                        : npc.status === "Deceased"
                        ? "bg-red-900/50 text-red-300 border-red-700"
                        : "bg-gray-900/50 text-gray-300 border-gray-700"
                    }`}
                  >
                    {npc.status}
                  </span>
                )}
              </InlineEditField>

              {/* Alignment (GM only) */}
              {isGM && (
                <InlineEditField
                  isEditing={editingField === "alignment"}
                  onEdit={() => handleStartEdit("alignment", npc.alignment)}
                  onSave={() => handleSaveField("alignment")}
                  onCancel={handleCancelEdit}
                  canEdit={canEdit}
                  isPending={isPending}
                  editComponent={
                    <select
                      value={editValues.alignment || ""}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          alignment: e.target.value,
                        })
                      }
                      className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-barlow font-bold text-sm uppercase text-white outline-none focus:border-hero-vibrant"
                    >
                      <option value="">-- Keine Gesinnung --</option>
                      {ALIGNMENTS.map((alignment) => (
                        <option key={alignment} value={alignment}>
                          {alignment}
                        </option>
                      ))}
                    </select>
                  }
                >
                  {npc.alignment && (
                    <span
                      className={`px-3 py-1 rounded text-sm font-barlow font-bold uppercase border ${getAlignmentColor(
                        npc.alignment
                      )}`}
                    >
                      {npc.alignment}
                    </span>
                  )}
                </InlineEditField>
              )}
            </div>

            {/* Faction */}
            <InlineEditField
              isEditing={editingField === "faction_id"}
              onEdit={() =>
                handleStartEdit("faction_id", npc.factions?.id || null)
              }
              onSave={() => handleSaveField("faction_id")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.faction_id || ""}
                  onChange={(e) =>
                    setEditValues({ ...editValues, faction_id: e.target.value })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Keine Fraktion --</option>
                  {factions.map((faction) => (
                    <option key={faction.id} value={faction.id}>
                      {faction.name}
                    </option>
                  ))}
                </select>
              }
            >
              {npc.factions ? (
                <div className="flex items-center gap-2">
                  <span className="font-libre text-gray-400">Fraktion:</span>
                  <span className="font-libre text-accent-gold font-semibold">
                    {npc.factions.name}
                  </span>
                </div>
              ) : canEdit ? (
                <button
                  onClick={() => handleStartEdit("faction_id", null)}
                  className="text-gray-500 hover:text-accent-gold text-sm font-libre"
                >
                  + Fraktion hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">
                  Keine Fraktion
                </p>
              )}
            </InlineEditField>

            {/* Location */}
            <InlineEditField
              isEditing={editingField === "current_location_id"}
              onEdit={() =>
                handleStartEdit(
                  "current_location_id",
                  npc.current_location?.id || null
                )
              }
              onSave={() => handleSaveField("current_location_id")}
              onCancel={handleCancelEdit}
              canEdit={canEdit}
              isPending={isPending}
              editComponent={
                <select
                  value={editValues.current_location_id || ""}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      current_location_id: e.target.value,
                    })
                  }
                  className="w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-white outline-none focus:border-hero-vibrant"
                >
                  <option value="">-- Kein Ort --</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.type})
                    </option>
                  ))}
                </select>
              }
            >
              {npc.current_location ? (
                <div className="flex items-center gap-2">
                  <span className="font-libre text-gray-400">
                    Aktueller Ort:
                  </span>
                  <Link
                    href={`/dashboard/campaigns/${campaignId}/locations/${npc.current_location.id}`}
                    className="font-libre text-hero-vibrant hover:underline"
                  >
                    {npc.current_location.name}
                  </Link>
                  {canEdit && (
                    <TravelQuickAction
                      npcId={npc.id}
                      currentLocationId={npc.current_location.id}
                      locations={locations}
                      campaignId={campaignId}
                      onUpdate={() => router.refresh()}
                    />
                  )}
                </div>
              ) : canEdit ? (
                <button
                  onClick={() => handleStartEdit("current_location_id", null)}
                  className="text-gray-500 hover:text-hero-vibrant text-sm font-libre"
                >
                  + Ort hinzufügen
                </button>
              ) : (
                <p className="font-libre text-gray-500 text-sm">
                  Kein Ort angegeben
                </p>
              )}
            </InlineEditField>

            {lastSeen && (lastSeen.archiveId || lastSeen.locationId || lastSeen.seenAt) && (
              <div className="rounded border border-accent-gold/30 bg-accent-gold/10 p-3">
                <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                  Zuletzt gesehen
                </p>
                <p className="font-libre text-sm text-gray-200">
                  {lastSeen.archiveId ? (
                    <Link
                      href={`/dashboard/campaigns/${campaignId}?tab=sessions&archive=${lastSeen.archiveId}`}
                      className="text-hero-vibrant hover:underline"
                    >
                      {lastSeen.sessionName || "Archivierte Session"}
                    </Link>
                  ) : (
                    <span>{lastSeen.sessionName || "In einer vergangenen Session"}</span>
                  )}
                  {lastSeen.locationId || lastSeen.locationName ? " bei " : ""}
                  {lastSeen.locationId ? (
                    <Link
                      href={`/dashboard/campaigns/${campaignId}/lore/${lastSeen.locationId}`}
                      className="text-hero-vibrant hover:underline"
                    >
                      {lastSeen.locationName || "unbekannter Ort"}
                    </Link>
                  ) : lastSeen.locationName ? (
                    <span>{lastSeen.locationName}</span>
                  ) : null}
                </p>
              </div>
            )}

            {sceneAppearances.length > 0 ? (
              <NpcSceneAppearances campaignId={campaignId} appearances={sceneAppearances} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
