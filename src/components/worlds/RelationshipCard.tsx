"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { deleteRelationship } from "@/src/app/dashboard/worlds/relationship-actions";
import type { RelationshipWithNames } from "@/src/app/dashboard/worlds/relationship-actions";

type Props = {
  relationship: RelationshipWithNames;
  currentNpcId: string;
  onEdit: (rel: RelationshipWithNames) => void;
};

export function RelationshipCard({ relationship: rel, currentNpcId, onEdit }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isSource = rel.source_id === currentNpcId;
  const otherName = isSource ? rel.target_name : rel.source_name;
  const otherImage = isSource ? rel.target_image_url : rel.source_image_url;
  const myRole = isSource ? rel.source_role : rel.target_role;
  const theirRole = isSource ? rel.target_role : rel.source_role;
  const myMonologue = isSource ? rel.monologue_source : rel.monologue_target;
  const theirMonologue = isSource ? rel.monologue_target : rel.monologue_source;

  const getAccentClass = (intensity: number) => {
    if (intensity < 0) return "border-red-700/60 bg-red-950/20";
    if (intensity > 0) return "border-emerald-700/60 bg-emerald-950/20";
    return "border-hero-dark/50 bg-slate-900/30";
  };

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

  const handleDelete = async () => {
    if (!confirm(`Beziehung zu "${otherName}" wirklich löschen?`)) return;
    setDeleting(true);
    try {
      await deleteRelationship(rel.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Fehler beim Löschen.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-3 transition-all ${getAccentClass(rel.intensity)}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {otherImage ? (
          <div className="relative h-10 w-10 rounded-full overflow-hidden border border-hero-border shrink-0">
            <Image src={otherImage} alt={otherName} fill className="object-cover" />
          </div>
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-hero-dark/50 border border-hero-border shrink-0">
            <User className="h-5 w-5 text-gray-500" />
          </div>
        )}

        {/* Textblock: alles untereinander */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Name + Schloss */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-barlow font-bold text-sm text-white wrap-break-word">
              {otherName}
            </span>
            {!rel.is_public && (
              <span title="Nur für GM sichtbar"><Lock className="h-3 w-3 text-gray-600 shrink-0" /></span>
            )}
          </div>

          {/* Rollen-Zeile */}
          {(myRole || theirRole) && (
            <div className="flex flex-wrap items-center gap-1">
              {myRole && (
                <span className="font-barlow text-[10px] font-bold uppercase text-accent-gold">
                  {myRole}
                </span>
              )}
              {myRole && theirRole && (
                <span className="text-gray-600 text-[10px]">↔</span>
              )}
              {theirRole && (
                <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
                  {theirRole}
                </span>
              )}
            </div>
          )}

          {/* Intensität untereinander */}
          <div className="flex items-baseline gap-2">
            <span className={`font-barlow font-extrabold text-base ${getIntensityColor(rel.intensity)}`}>
              {rel.intensity > 0 ? "+" : ""}{rel.intensity}
            </span>
            <span className={`font-barlow text-[10px] font-bold uppercase ${getIntensityColor(rel.intensity)}`}>
              {getIntensityLabel(rel.intensity)}
            </span>
          </div>
        </div>

        {/* Actions rechts oben */}
        <div className="flex items-start gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-slate-800"
            title={expanded ? "Weniger" : "Mehr"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(rel)}
            className="p-1 rounded text-gray-500 hover:text-accent-gold hover:bg-accent-gold/10"
            title="Bearbeiten"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
            title="Löschen"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-hero-dark/30 space-y-2">
          {myMonologue && (
            <div>
              <p className="font-barlow text-[10px] font-bold uppercase text-gray-500 mb-0.5">
                Innerer Monolog:
              </p>
              <p className="font-libre text-xs text-gray-300 italic leading-relaxed">
                &ldquo;{myMonologue}&rdquo;
              </p>
            </div>
          )}
          {theirMonologue && (
            <div>
              <p className="font-barlow text-[10px] font-bold uppercase text-gray-500 mb-0.5">
                {otherName} denkt:
              </p>
              <p className="font-libre text-xs text-gray-300 italic leading-relaxed">
                &ldquo;{theirMonologue}&rdquo;
              </p>
            </div>
          )}
          {rel.is_public && rel.public_description && (
            <div>
              <p className="font-barlow text-[10px] font-bold uppercase text-gray-500 mb-0.5">
                Öffentlich bekannt:
              </p>
              <p className="font-libre text-xs text-gray-200 leading-relaxed">
                {rel.public_description}
              </p>
            </div>
          )}
          {rel.history && rel.history.length > 0 && (
            <p className="font-libre text-[10px] text-gray-600">
              {rel.history.length} frühere Zustände aufgezeichnet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
