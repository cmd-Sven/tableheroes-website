import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import {
  imageDisplayBackdropStyle,
  imageDisplayObjectStyle,
  normalizeImageDisplay,
} from "@/src/lib/image-display";
import {
  ArrowLeft,
  Shield,
  Edit2,
  MapPin,
  Scroll,
  AlertCircle,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getFactionById } from "@/src/app/dashboard/campaigns/[id]/factions-actions";

type Props = {
  params: Promise<{ id: string; factionId: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  "Im Krieg": "bg-red-900/50 text-red-300 border-red-700",
  Feindlich: "bg-orange-900/50 text-orange-300 border-orange-700",
  Verbündet: "bg-green-900/50 text-green-300 border-green-700",
  Freundlich: "bg-blue-900/50 text-blue-300 border-blue-700",
  Neutral: "bg-gray-900/50 text-gray-300 border-gray-700",
};

function getStatusBadgeColor(status: string | null) {
  if (!status) return "bg-gray-800/50 text-gray-300 border-gray-700";
  return STATUS_COLORS[status] ?? "bg-gray-800/50 text-gray-300 border-gray-700";
}

/** Parst "Wichtige Persönlichkeiten"-Text in Name + Beschreibung (wie Kampagnen-Detailseite). */
function parseImportantMembers(
  text: string | null | undefined
): Array<{ name: string; description: string }> {
  if (!text || !text.trim()) return [];
  const members: Array<{ name: string; description: string }> = [];
  const matches = [
    ...(text.matchAll(/([^–—\-:]+?)\s*[:\-–—]\s*([^.!?\n]+[.!?\n]?)/g) as Iterable<RegExpMatchArray>),
  ];
  for (const match of matches) {
    const name = match[1]?.trim();
    const description = match[2]?.trim();
    if (name && name.length > 1) members.push({ name, description: description || "" });
  }
  if (members.length === 0) {
    const segments = text.split(/\r?\n|•|\*|;/).map((s) => s.trim()).filter((s) => s.length > 0);
    for (const segment of segments) {
      const m = segment.match(/^([^–—\-:]+)[:\-–—]\s*(.+)$/);
      const name = m ? m[1].trim() : segment;
      const description = m ? m[2].trim() : "";
      if (name.length > 1) members.push({ name, description });
    }
  }
  if (members.length === 0 && text.trim())
    members.push({ name: "Unbekannte Person", description: text.trim() });
  return members;
}

export default async function WorldFactionDetailPage({ params }: Props) {
  const { id: worldId, factionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();

  const faction = await getFactionById(factionId);
  if (!faction) notFound();
  const f = faction as any;
  if (f.world_id !== worldId) redirect(`/dashboard/worlds/${worldId}/factions`);

  const isGM = (worldRaw as { gm_id: string }).gm_id === user.id;
  const hasLocation = f.locations && (f.locations as { id: string }).id;
  const hasLore = f.lore_entry && (f.lore_entry as { id: string }).id;
  // „Wichtige Persönlichkeiten“ = dieselbe Quelle wie Formular-„Mitglieder“: planned_members, Fallback parsed important_npcs_info
  type PlannedMember = { name: string; role?: string; npc_id?: string | null };
  const plannedMembers: PlannedMember[] = Array.isArray((f as { planned_members?: PlannedMember[] }).planned_members)
    ? (f as { planned_members: PlannedMember[] }).planned_members
    : [];
  const membersFromPlanned = plannedMembers
    .filter((m) => m.name && String(m.name).trim() !== "")
    .map((m) => ({
      name: String(m.name).trim(),
      description: (m.role && String(m.role).trim()) || "Mitglied",
      npc_id: m.npc_id ?? null,
    }));
  const membersFromText = parseImportantMembers(f.important_npcs_info).map((m) => ({ ...m, npc_id: null as string | null }));
  const importantMembers: Array<{ name: string; description: string; npc_id: string | null }> =
    membersFromPlanned.length > 0 ? membersFromPlanned : membersFromText;

  const hasExtended =
    (f.appearance && f.appearance.trim() !== "") ||
    (f.structure && f.structure.trim() !== "") ||
    (f.philosophy && f.philosophy.trim() !== "") ||
    importantMembers.length > 0 ||
    (f.important_npcs_info && f.important_npcs_info.trim() !== "");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/worlds/${worldId}/factions`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zu Fraktionen
        </Link>
        <Link
          href={`/dashboard/worlds/${worldId}/factions/${factionId}/edit`}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-white hover:bg-hero-dark transition-colors"
        >
          <Edit2 className="h-4 w-4" />
          Bearbeiten
        </Link>
      </div>

      {/* Header-Karte: Banner, Typ, Name, Status */}
      <div
        className="rounded-lg border-2 border-hero-dark bg-background-card shadow-xl overflow-hidden"
        style={{ borderColor: "rgba(35, 199, 99, 0.5)" }}
      >
        {f.banner_url ? (
          <div
            className="relative w-full h-44 sm:h-52 border-b border-hero-border"
            style={imageDisplayBackdropStyle(normalizeImageDisplay(f.banner_display))}
          >
            <Image
              src={f.banner_url}
              alt={`${f.name} Banner`}
              fill
              className="select-none"
              style={imageDisplayObjectStyle(normalizeImageDisplay(f.banner_display))}
              unoptimized
            />
          </div>
        ) : null}
        <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-accent-gold shrink-0" />
              {f.type && (
                <span className="px-2 py-1 rounded text-xs font-barlow font-bold uppercase border border-hero-border bg-hero-dark/50 text-hero-vibrant">
                  {f.type}
                </span>
              )}
              {f.current_status && (
                <span
                  className={`px-2 py-1 rounded text-xs font-barlow font-bold uppercase border ${getStatusBadgeColor(
                    f.current_status
                  )}`}
                >
                  {f.current_status}
                </span>
              )}
            </div>
            <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant mb-2">
              {f.name}
            </h1>
            {hasLocation && (
              <div className="flex items-center gap-2 text-gray-400 font-libre text-sm">
                <MapPin className="h-4 w-4 text-accent-gold" />
                <span>Ansässig in: </span>
                <Link
                  href={`/dashboard/worlds/${worldId}/lore/${(f.locations as { id: string }).id}`}
                  className="text-accent-gold font-semibold hover:underline"
                >
                  {(f.locations as { name: string }).name}
                </Link>
              </div>
            )}
            {hasLore && (
              <div className="mt-2">
                <Link
                  href={`/dashboard/worlds/${worldId}/lore/${(f.lore_entry as { id: string }).id}`}
                  className="inline-flex items-center gap-2 rounded border border-accent-gold/50 bg-accent-gold/10 px-4 py-2 font-barlow font-bold text-sm uppercase text-accent-gold hover:bg-accent-gold/20 transition-colors"
                >
                  <Scroll className="h-4 w-4" />
                  Zum Lore-Eintrag
                </Link>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Beschreibung */}
      <div
        className="rounded-lg p-6 relative overflow-hidden shadow-xl"
        style={{
          border: "2px solid rgba(202, 185, 38, 0.5)",
          backgroundImage: "url('/images/grunge-paper-background.webp')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="font-barlow font-semibold text-2xl text-accent-blood border-b border-hero-border pb-2 mb-4">
            Beschreibung
          </h2>
          {f.image_url ? (
            <div
              className="relative float-left mr-4 mb-3 w-16 h-16 rounded-lg overflow-hidden border border-hero-border shadow-md"
              style={imageDisplayBackdropStyle(normalizeImageDisplay(f.image_display))}
            >
              <Image
                src={f.image_url}
                alt={`${f.name} Wappen`}
                fill
                className="select-none"
                style={imageDisplayObjectStyle(normalizeImageDisplay(f.image_display))}
                unoptimized
              />
            </div>
          ) : null}
          {f.description ? (
            <div className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {f.description}
            </div>
          ) : (
            <p className="font-libre text-gray-500 italic">Keine Beschreibung.</p>
          )}
        </div>
      </div>

      {/* Erweiterte Felder: Erscheinungsbild, Struktur, Philosophie, Wichtige Persönlichkeiten */}
      {hasExtended && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {f.appearance && f.appearance.trim() !== "" && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/dark-marmor.webp')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-3 border-b border-hero-border pb-2">
                  Identität & Heraldik
                </h3>
                <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                  {f.appearance}
                </p>
              </div>
            </div>
          )}
          {f.philosophy && f.philosophy.trim() !== "" && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/dark-marmor.webp')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-3 border-b border-hero-border pb-2">
                  Kodex & Weltbild
                </h3>
                <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                  {f.philosophy}
                </p>
              </div>
            </div>
          )}
          {f.structure && f.structure.trim() !== "" && (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl md:col-span-2"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/dark-marmor.webp')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-3 border-b border-hero-border pb-2">
                  Organisation
                </h3>
                <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                  {f.structure}
                </p>
              </div>
            </div>
          )}
          {importantMembers.length > 0 || (f.important_npcs_info && f.important_npcs_info.trim() !== "") ? (
            <div
              className="rounded-lg p-6 relative overflow-hidden shadow-xl md:col-span-2"
              style={{
                border: "2px solid rgba(202, 185, 38, 0.5)",
                backgroundImage: "url('/images/scroll-paper.webp')",
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-cinzel font-bold text-xl text-accent-gold mb-3 border-b border-hero-border pb-2">
                  Wichtige Persönlichkeiten
                </h3>
                {importantMembers.length > 0 ? (
                  <>
                    <p className="font-libre text-[#e5e5e5] text-sm mb-4">
                      Diese Personen (aus dem Bereich „Mitglieder“ im Formular) kannst du als NPCs in der Welt anlegen. Sie stehen danach in allen Kampagnen mit dieser Welt zur Verfügung; in jeder Kampagne kannst du sie für Spieler sichtbar schalten.
                    </p>
                    <ul className="space-y-3">
                      {importantMembers.map((member, idx) => (
                        <li
                          key={`${member.name}-${idx}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-hero-border/60 bg-slate-900/40 px-3 py-2"
                        >
                          <div>
                            <span className="font-cinzel font-bold text-accent-gold">{member.name}</span>
                            {member.description && (
                              <p className="font-libre text-sm text-gray-400 mt-0.5">{member.description}</p>
                            )}
                          </div>
                          {member.npc_id ? (
                            <Link
                              href={`/dashboard/worlds/${worldId}/npcs/${member.npc_id}`}
                              className="inline-flex items-center gap-2 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Bereits als NPC angelegt
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/worlds/${worldId}/npcs/new?name=${encodeURIComponent(member.name)}&factionId=${encodeURIComponent(factionId)}&description=${encodeURIComponent(member.description)}`}
                              className="inline-flex items-center gap-2 rounded border border-hero-vibrant/50 bg-hero-vibrant/10 px-3 py-1.5 font-barlow font-bold text-xs uppercase text-hero-vibrant hover:bg-hero-vibrant/20 transition-colors"
                            >
                              <UserPlus className="h-4 w-4" />
                              NPC anlegen
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="font-libre text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                    {f.important_npcs_info}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* GM-Notizen (nur für Welt-Besitzer) */}
      {isGM && (f.gm_notes != null && f.gm_notes !== "") && (
        <div
          className="rounded-lg p-6 relative overflow-hidden shadow-xl"
          style={{
            border: "2px solid rgba(202, 185, 38, 0.5)",
            backgroundImage: "url('/images/dark-wood.webp')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-barlow font-semibold text-xl text-accent-blood flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5" />
              GM-Notizen
            </h2>
            <p className="font-libre text-gray-200 leading-relaxed whitespace-pre-wrap">
              {f.gm_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
