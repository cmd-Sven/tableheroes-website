"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createBestariumCreature,
  updateBestariumCreature,
  type BestariumAttack,
  type BestariumCreatureRow,
} from "@/src/app/dashboard/worlds/world-bestarium-actions";

type LoreOpt = { id: string; name: string; type: string | null };

type Props = {
  worldId: string;
  locations: Array<{ id: string; name: string; type: string }>;
  loreEntries: LoreOpt[];
  creature?: BestariumCreatureRow | null;
};

function attacksFromRow(row: BestariumCreatureRow | null | undefined): BestariumAttack[] {
  if (!row?.attacks) return [];
  if (Array.isArray(row.attacks)) return row.attacks as BestariumAttack[];
  return [];
}

function emptyAttack(): BestariumAttack {
  return {
    name: "",
    attack_bonus: null,
    damage_notation: "",
    damage_type: "",
    range: "",
    notes: "",
  };
}

export function WorldBestariumForm({ worldId, locations, loreEntries, creature }: Props) {
  const router = useRouter();
  const isEdit = !!creature;
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(creature?.name ?? "");
  const [gameSystem, setGameSystem] = useState(creature?.game_system ?? "dnd5e");
  const [sizeCategory, setSizeCategory] = useState(creature?.size_category ?? "");
  const [creatureType, setCreatureType] = useState(creature?.creature_type ?? "");
  const [subtype, setSubtype] = useState(creature?.subtype ?? "");
  const [alignment, setAlignment] = useState(creature?.alignment ?? "");

  const [armorClass, setArmorClass] = useState(creature?.armor_class != null ? String(creature.armor_class) : "");
  const [hitPoints, setHitPoints] = useState(creature?.hit_points != null ? String(creature.hit_points) : "");
  const [hitDice, setHitDice] = useState(creature?.hit_dice ?? "");
  const [damageVuln, setDamageVuln] = useState(creature?.damage_vulnerabilities ?? "");
  const [damageRes, setDamageRes] = useState(creature?.damage_resistances ?? "");
  const [damageImm, setDamageImm] = useState(creature?.damage_immunities ?? "");
  const [condImm, setCondImm] = useState(creature?.condition_immunities ?? "");

  const [str, setStr] = useState(creature?.ability_str != null ? String(creature.ability_str) : "");
  const [dex, setDex] = useState(creature?.ability_dex != null ? String(creature.ability_dex) : "");
  const [con, setCon] = useState(creature?.ability_con != null ? String(creature.ability_con) : "");
  const [int, setInt] = useState(creature?.ability_int != null ? String(creature.ability_int) : "");
  const [wis, setWis] = useState(creature?.ability_wis != null ? String(creature.ability_wis) : "");
  const [cha, setCha] = useState(creature?.ability_cha != null ? String(creature.ability_cha) : "");

  const [multiattack, setMultiattack] = useState(creature?.multiattack_notes ?? "");
  const [attacks, setAttacks] = useState<BestariumAttack[]>(() => {
    const a = attacksFromRow(creature ?? null);
    return a.length ? a : [emptyAttack()];
  });
  const [specialAbilities, setSpecialAbilities] = useState(creature?.special_abilities ?? "");
  const [legendary, setLegendary] = useState(creature?.legendary_actions ?? "");
  const [lair, setLair] = useState(creature?.lair_actions ?? "");

  const [cr, setCr] = useState(creature?.challenge_rating != null ? String(creature.challenge_rating) : "");
  const [xp, setXp] = useState(creature?.xp_awarded != null ? String(creature.xp_awarded) : "");

  const [senses, setSenses] = useState(creature?.senses ?? "");
  const [languages, setLanguages] = useState(creature?.languages ?? "");
  const [passiveTraits, setPassiveTraits] = useState(creature?.passive_traits ?? "");
  const [physicalDesc, setPhysicalDesc] = useState(creature?.physical_description ?? "");
  const [loreNotes, setLoreNotes] = useState(creature?.lore_notes ?? "");

  const [locationId, setLocationId] = useState(creature?.location_id ?? "");
  const [loreId, setLoreId] = useState(creature?.lore_id ?? "");
  const [imageUrl, setImageUrl] = useState(creature?.image_url ?? "");
  const [sortOrder, setSortOrder] = useState(creature?.sort_order != null ? String(creature.sort_order) : "0");

  const parseOptInt = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  };

  const parseOptFloat = (s: string): number | null => {
    const t = s.trim().replace(",", ".");
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  const buildPayload = () => {
    const attackRows = attacks
      .filter((a) => (a.name || "").trim().length > 0)
      .map((a) => ({
        name: a.name.trim(),
        attack_bonus:
          a.attack_bonus === null || a.attack_bonus === undefined
            ? null
            : typeof a.attack_bonus === "number"
              ? a.attack_bonus
              : parseOptInt(String(a.attack_bonus)),
        damage_notation: (a.damage_notation || "").trim(),
        damage_type: (a.damage_type || "").trim() || null,
        range: (a.range || "").trim() || null,
        notes: (a.notes || "").trim() || null,
      }));

    return {
      name: name.trim(),
      game_system: gameSystem.trim() || "dnd5e",
      size_category: sizeCategory.trim() || null,
      creature_type: creatureType.trim() || null,
      subtype: subtype.trim() || null,
      alignment: alignment.trim() || null,
      armor_class: parseOptInt(armorClass),
      hit_points: parseOptInt(hitPoints),
      hit_dice: hitDice.trim() || null,
      damage_vulnerabilities: damageVuln.trim() || null,
      damage_resistances: damageRes.trim() || null,
      damage_immunities: damageImm.trim() || null,
      condition_immunities: condImm.trim() || null,
      ability_str: parseOptInt(str),
      ability_dex: parseOptInt(dex),
      ability_con: parseOptInt(con),
      ability_int: parseOptInt(int),
      ability_wis: parseOptInt(wis),
      ability_cha: parseOptInt(cha),
      multiattack_notes: multiattack.trim() || null,
      attacks: attackRows,
      special_abilities: specialAbilities.trim() || null,
      legendary_actions: legendary.trim() || null,
      lair_actions: lair.trim() || null,
      challenge_rating: parseOptFloat(cr),
      xp_awarded: parseOptInt(xp),
      senses: senses.trim() || null,
      languages: languages.trim() || null,
      passive_traits: passiveTraits.trim() || null,
      physical_description: physicalDesc.trim() || null,
      lore_notes: loreNotes.trim() || null,
      world_id: worldId,
      location_id: locationId || null,
      lore_id: loreId || null,
      image_url: imageUrl.trim() || null,
      sort_order: parseOptInt(sortOrder) ?? 0,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Bitte einen Namen angeben.");
      return;
    }
    startTransition(async () => {
      try {
        const payload = buildPayload();
        if (isEdit && creature) {
          await updateBestariumCreature(creature.id, payload);
          router.push(`/dashboard/worlds/${worldId}/bestarium/${creature.id}`);
        } else {
          const { id } = await createBestariumCreature(payload);
          router.push(`/dashboard/worlds/${worldId}/bestarium/${id}`);
        }
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Fehler beim Speichern.");
      }
    });
  };

  const inputClass =
    "w-full rounded border border-hero-dark bg-slate-900 p-2 font-libre text-sm text-white focus:border-hero-vibrant outline-none";
  const labelClass = "font-barlow font-bold uppercase text-xs text-gray-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-lg border border-hero-dark bg-background-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-hero-dark pb-4">
        <h1 className="font-barlow font-extrabold text-2xl uppercase tracking-wide text-hero-vibrant">
          {isEdit ? "Kreatur bearbeiten" : "Neue Kreatur"}
        </h1>
        <Link
          href={`/dashboard/worlds/${worldId}/bestarium`}
          className="font-barlow font-bold uppercase text-xs text-gray-400 hover:text-white"
        >
          Zurück zur Liste
        </Link>
      </div>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Identität
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Name</span>
            <input className={`mt-1 ${inputClass}`} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            <span className={labelClass}>System</span>
            <input className={`mt-1 ${inputClass}`} value={gameSystem} onChange={(e) => setGameSystem(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Größe (D&amp;D)</span>
            <input
              className={`mt-1 ${inputClass}`}
              value={sizeCategory}
              onChange={(e) => setSizeCategory(e.target.value)}
              placeholder="Medium, Large …"
            />
          </label>
          <label>
            <span className={labelClass}>Typ</span>
            <input
              className={`mt-1 ${inputClass}`}
              value={creatureType}
              onChange={(e) => setCreatureType(e.target.value)}
              placeholder="beast, undead …"
            />
          </label>
          <label>
            <span className={labelClass}>Untertyp</span>
            <input className={`mt-1 ${inputClass}`} value={subtype} onChange={(e) => setSubtype(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Gesinnung</span>
            <input className={`mt-1 ${inputClass}`} value={alignment} onChange={(e) => setAlignment(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Defensive
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className={labelClass}>RK (AC)</span>
            <input className={`mt-1 ${inputClass}`} value={armorClass} onChange={(e) => setArmorClass(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>TP (HP)</span>
            <input className={`mt-1 ${inputClass}`} value={hitPoints} onChange={(e) => setHitPoints(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Trefferwürfel</span>
            <input className={`mt-1 ${inputClass}`} value={hitDice} onChange={(e) => setHitDice(e.target.value)} placeholder="8d10+16" />
          </label>
        </div>
        <div className="grid gap-4 mt-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Verwundbarkeiten</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={damageVuln} onChange={(e) => setDamageVuln(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Resistenzen</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={damageRes} onChange={(e) => setDamageRes(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Immunitäten (Schaden)</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={damageImm} onChange={(e) => setDamageImm(e.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Immunitäten (Zustände)</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={condImm} onChange={(e) => setCondImm(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Attribute
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <label>
            <span className={labelClass}>STR</span>
            <input className={`mt-1 ${inputClass}`} value={str} onChange={(e) => setStr(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>DEX</span>
            <input className={`mt-1 ${inputClass}`} value={dex} onChange={(e) => setDex(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>CON</span>
            <input className={`mt-1 ${inputClass}`} value={con} onChange={(e) => setCon(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>INT</span>
            <input className={`mt-1 ${inputClass}`} value={int} onChange={(e) => setInt(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>WIS</span>
            <input className={`mt-1 ${inputClass}`} value={wis} onChange={(e) => setWis(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>CHA</span>
            <input className={`mt-1 ${inputClass}`} value={cha} onChange={(e) => setCha(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Offensive
        </h2>
        <label className="block mb-4">
          <span className={labelClass}>Multiattack / Kombinationen</span>
          <textarea className={`mt-1 ${inputClass}`} rows={2} value={multiattack} onChange={(e) => setMultiattack(e.target.value)} />
        </label>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-cinzel font-bold text-lg text-accent-gold">Angriffe</h3>
            <button
              type="button"
              onClick={() => setAttacks((prev) => [...prev, emptyAttack()])}
              className="inline-flex items-center gap-1 rounded border border-hero-border px-2 py-1 font-barlow font-bold uppercase text-xs text-hero-vibrant hover:bg-hero-dark"
            >
              <Plus className="h-3 w-3" />
              Zeile
            </button>
          </div>
          {attacks.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-6 border border-hero-dark/50 rounded p-3 bg-background-dark/30">
              <label className="sm:col-span-2">
                <span className={labelClass}>Name</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.name}
                  onChange={(e) => {
                    const next = [...attacks];
                    next[i] = { ...row, name: e.target.value };
                    setAttacks(next);
                  }}
                />
              </label>
              <label>
                <span className={labelClass}>Bonus</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.attack_bonus != null ? String(row.attack_bonus) : ""}
                  onChange={(e) => {
                    const next = [...attacks];
                    const v = e.target.value.trim();
                    next[i] = { ...row, attack_bonus: v === "" ? null : parseInt(v, 10) };
                    setAttacks(next);
                  }}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Schaden</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.damage_notation}
                  onChange={(e) => {
                    const next = [...attacks];
                    next[i] = { ...row, damage_notation: e.target.value };
                    setAttacks(next);
                  }}
                  placeholder="2d6+3"
                />
              </label>
              <label>
                <span className={labelClass}>Typ</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.damage_type ?? ""}
                  onChange={(e) => {
                    const next = [...attacks];
                    next[i] = { ...row, damage_type: e.target.value };
                    setAttacks(next);
                  }}
                />
              </label>
              <label className="sm:col-span-3">
                <span className={labelClass}>Reichweite</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.range ?? ""}
                  onChange={(e) => {
                    const next = [...attacks];
                    next[i] = { ...row, range: e.target.value };
                    setAttacks(next);
                  }}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Notizen</span>
                <input
                  className={`mt-1 ${inputClass}`}
                  value={row.notes ?? ""}
                  onChange={(e) => {
                    const next = [...attacks];
                    next[i] = { ...row, notes: e.target.value };
                    setAttacks(next);
                  }}
                />
              </label>
              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => setAttacks((prev) => prev.filter((_, j) => j !== i))}
                  className="p-2 text-red-400 hover:bg-red-950/40 rounded"
                  aria-label="Zeile entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <label className="block mt-4">
          <span className={labelClass}>Besondere Fähigkeiten</span>
          <textarea
            className={`mt-1 ${inputClass}`}
            rows={4}
            value={specialAbilities}
            onChange={(e) => setSpecialAbilities(e.target.value)}
          />
        </label>
        <label className="block mt-2">
          <span className={labelClass}>Legendäre Aktionen</span>
          <textarea className={`mt-1 ${inputClass}`} rows={3} value={legendary} onChange={(e) => setLegendary(e.target.value)} />
        </label>
        <label className="block mt-2">
          <span className={labelClass}>Lair-Aktionen</span>
          <textarea className={`mt-1 ${inputClass}`} rows={3} value={lair} onChange={(e) => setLair(e.target.value)} />
        </label>
      </section>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Schwierigkeit
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>CR</span>
            <input className={`mt-1 ${inputClass}`} value={cr} onChange={(e) => setCr(e.target.value)} placeholder="2 oder 0.25" />
          </label>
          <label>
            <span className={labelClass}>XP</span>
            <input className={`mt-1 ${inputClass}`} value={xp} onChange={(e) => setXp(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="font-barlow font-semibold text-xl text-accent-blood border-b border-hero-border pb-2 mb-4">
          Flavor &amp; Zuordnung
        </h2>
        <div className="grid gap-4">
          <label>
            <span className={labelClass}>Sinne</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={senses} onChange={(e) => setSenses(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Sprachen</span>
            <textarea className={`mt-1 ${inputClass}`} rows={2} value={languages} onChange={(e) => setLanguages(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Passive Talente / Traits</span>
            <textarea
              className={`mt-1 ${inputClass}`}
              rows={3}
              value={passiveTraits}
              onChange={(e) => setPassiveTraits(e.target.value)}
            />
          </label>
          <label>
            <span className={labelClass}>Erscheinung</span>
            <textarea
              className={`mt-1 ${inputClass}`}
              rows={3}
              value={physicalDesc}
              onChange={(e) => setPhysicalDesc(e.target.value)}
            />
          </label>
          <label>
            <span className={labelClass}>Lore / GM-Notizen</span>
            <textarea className={`mt-1 ${inputClass}`} rows={3} value={loreNotes} onChange={(e) => setLoreNotes(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Bild-URL</span>
            <input className={`mt-1 ${inputClass}`} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Sortierung</span>
            <input className={`mt-1 ${inputClass}`} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Ort</span>
            <select className={`mt-1 ${inputClass}`} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">— keiner —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Lore-Eintrag</span>
            <select className={`mt-1 ${inputClass}`} value={loreId} onChange={(e) => setLoreId(e.target.value)}>
              <option value="">— keiner —</option>
              {loreEntries.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {l.type ? ` (${l.type})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-2 pt-4 border-t border-hero-dark">
        <Link
          href={`/dashboard/worlds/${worldId}/bestarium`}
          className="rounded border border-hero-dark px-4 py-2 font-barlow font-bold uppercase text-xs text-gray-300 hover:text-white"
        >
          Abbrechen
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded bg-hero-vibrant px-4 py-2 font-barlow font-bold uppercase text-sm text-background-dark hover:bg-hero-dark hover:text-white disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Speichern
        </button>
      </div>
    </form>
  );
}
