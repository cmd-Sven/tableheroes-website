import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { getBestariumCreatureById, type BestariumAttack } from "@/src/app/dashboard/worlds/world-bestarium-actions";

type Props = {
  params: Promise<{ id: string; creatureId: string }>;
};

export default async function WorldBestariumDetailPage({ params }: Props) {
  const { id: worldId, creatureId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();
  if (!(worldRaw as { blueprint?: unknown }).blueprint) notFound();

  const creature = await getBestariumCreatureById(creatureId);
  if (!creature || creature.world_id !== worldId) notFound();

  const locations = await getAllLocationsByWorld(worldId);
  const locMap = new Map<string, string>(
    (locations ?? []).map((l: { id: string; name?: string | null }) => [String(l.id), String(l.name ?? "Ort")])
  );
  const locationName: string | null = creature.location_id
    ? locMap.get(creature.location_id) ?? "—"
    : null;

  const attacks = (Array.isArray(creature.attacks) ? creature.attacks : []) as BestariumAttack[];

  const worldName = (worldRaw as { name: string }).name;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href={`/dashboard/worlds/${worldId}/bestarium`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Bestarium · {worldName}
        </Link>
        <Link
          href={`/dashboard/worlds/${worldId}/bestarium/${creatureId}/edit`}
          className="inline-flex items-center gap-2 rounded border border-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:bg-hero-vibrant hover:text-background-dark transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Bearbeiten
        </Link>
      </div>

      <article className="rounded-lg border border-hero-dark bg-background-card p-6 sm:p-8 shadow-lg space-y-6">
        <header className="border-b border-hero-border pb-4">
          <h1 className="font-barlow font-extrabold text-3xl uppercase tracking-wide text-hero-vibrant">{creature.name}</h1>
          <p className="font-libre text-gray-300 mt-2">
            <span className="text-accent-gold">{creature.game_system}</span>
            {creature.size_category ? ` · ${creature.size_category}` : ""}
            {creature.creature_type ? ` ${creature.creature_type}` : ""}
            {creature.subtype ? ` (${creature.subtype})` : ""}
            {creature.alignment ? `, ${creature.alignment}` : ""}
          </p>
          {locationName && (
            <p className="font-libre text-sm text-gray-400 mt-1">Vorkommen: {locationName}</p>
          )}
        </header>

        <section>
          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
            Defensive
          </h2>
          <dl className="grid grid-cols-2 gap-2 font-libre text-sm text-gray-200">
            <dt className="text-gray-500">Rüstungsklasse</dt>
            <dd>{creature.armor_class ?? "—"}</dd>
            <dt className="text-gray-500">Trefferpunkte</dt>
            <dd>
              {creature.hit_points ?? "—"}
              {creature.hit_dice ? ` (${creature.hit_dice})` : ""}
            </dd>
            <dt className="text-gray-500">CR / XP</dt>
            <dd>
              {creature.challenge_rating ?? "—"} / {creature.xp_awarded ?? "—"}
            </dd>
          </dl>
          {(creature.damage_vulnerabilities || creature.damage_resistances || creature.damage_immunities || creature.condition_immunities) && (
            <div className="mt-4 space-y-2 font-libre text-sm text-gray-300">
              {creature.damage_vulnerabilities && (
                <p>
                  <span className="text-accent-gold">Verwundbar:</span> {creature.damage_vulnerabilities}
                </p>
              )}
              {creature.damage_resistances && (
                <p>
                  <span className="text-accent-gold">Resistent:</span> {creature.damage_resistances}
                </p>
              )}
              {creature.damage_immunities && (
                <p>
                  <span className="text-accent-gold">Immun (Schaden):</span> {creature.damage_immunities}
                </p>
              )}
              {creature.condition_immunities && (
                <p>
                  <span className="text-accent-gold">Immun (Zustände):</span> {creature.condition_immunities}
                </p>
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
            Attribute
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 font-libre text-sm text-center">
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((label, i) => {
              const vals = [
                creature.ability_str,
                creature.ability_dex,
                creature.ability_con,
                creature.ability_int,
                creature.ability_wis,
                creature.ability_cha,
              ];
              return (
                <div key={label} className="rounded border border-hero-dark/50 bg-background-dark/40 p-2">
                  <div className="text-gray-500 text-xs">{label}</div>
                  <div className="text-lg text-white">{vals[i] ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
            Aktionen
          </h2>
          {creature.multiattack_notes && (
            <p className="font-libre text-sm text-gray-200 mb-3 whitespace-pre-wrap">{creature.multiattack_notes}</p>
          )}
          <ul className="space-y-3">
            {attacks.length === 0 ? (
              <li className="font-libre text-sm text-gray-500">Keine Angriffe hinterlegt.</li>
            ) : (
              attacks.map((a, idx) => (
                <li key={idx} className="rounded border border-hero-border/40 p-3 bg-background-dark/30 font-libre text-sm text-gray-200">
                  <span className="font-cinzel font-bold text-accent-gold">{a.name}</span>
                  {a.attack_bonus != null && (
                    <span className="text-gray-400"> · +{a.attack_bonus} zu treffen</span>
                  )}
                  <div className="mt-1">
                    {a.damage_notation || "—"}
                    {a.damage_type ? ` ${a.damage_type}` : ""}
                    {a.range ? ` · ${a.range}` : ""}
                  </div>
                  {a.notes && <p className="text-gray-400 text-xs mt-1">{a.notes}</p>}
                </li>
              ))
            )}
          </ul>
        </section>

        {creature.special_abilities && (
          <section>
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
              Besondere Fähigkeiten
            </h2>
            <div className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.special_abilities}</div>
          </section>
        )}

        {(creature.legendary_actions || creature.lair_actions) && (
          <section className="space-y-4">
            {creature.legendary_actions && (
              <div>
                <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-2">
                  Legendäre Aktionen
                </h2>
                <div className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.legendary_actions}</div>
              </div>
            )}
            {creature.lair_actions && (
              <div>
                <h2 className="font-barlow font-semibold text-lg text-accent-blood border-b border-hero-border pb-2 mb-2">
                  Lair-Aktionen
                </h2>
                <div className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.lair_actions}</div>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
            Sinne &amp; Sprache
          </h2>
          <div className="font-libre text-sm text-gray-200 space-y-2">
            {creature.senses && <p>{creature.senses}</p>}
            {creature.languages && <p>{creature.languages}</p>}
            {!creature.senses && !creature.languages && <p className="text-gray-500">—</p>}
          </div>
        </section>

        {creature.passive_traits && (
          <section>
            <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-3">
              Passive Talente
            </h2>
            <div className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.passive_traits}</div>
          </section>
        )}

        {(creature.physical_description || creature.lore_notes) && (
          <section className="space-y-3">
            {creature.physical_description && (
              <div>
                <h2 className="font-cinzel font-bold text-lg text-accent-gold mb-2">Erscheinung</h2>
                <p className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.physical_description}</p>
              </div>
            )}
            {creature.lore_notes && (
              <div>
                <h2 className="font-cinzel font-bold text-lg text-accent-gold mb-2">Lore</h2>
                <p className="font-libre text-sm text-gray-200 whitespace-pre-wrap">{creature.lore_notes}</p>
              </div>
            )}
          </section>
        )}
      </article>
    </div>
  );
}
