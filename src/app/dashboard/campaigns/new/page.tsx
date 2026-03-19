import { createCampaignAction } from "./actions";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles, Globe } from "lucide-react";
import Link from "next/link";

export default async function CreateCampaignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  if (profile?.primary_role !== "GameMaster" && profile?.primary_role !== "Admin") {
    redirect("/dashboard");
  }

  const { data: worldsRaw } = await (supabase.from("worlds") as any)
    .select("id, name")
    .eq("gm_id", user.id)
    .order("name", { ascending: true });
  const worlds = (worldsRaw as { id: string; name: string }[]) || [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück
      </Link>

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="h-10 w-10 text-accent-gold" />
        <div>
          <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
            Neue Kampagne erstellen
          </h1>
          <p className="mt-1 font-libre text-gray-400">
            Wähle eine Basis-Welt und lade deine Spieler ein.
          </p>
        </div>
      </div>

      {worlds.length === 0 ? (
        <div className="rounded-md border border-hero-dark bg-background-card p-6 text-center">
          <Globe className="h-12 w-12 text-hero-vibrant mx-auto mb-4" />
          <h2 className="font-barlow font-bold text-xl text-white mb-2">Zuerst eine Welt anlegen</h2>
          <p className="font-libre text-gray-400 mb-4 max-w-md mx-auto">
            Jede Kampagne braucht eine Basis-Welt für Lore und NPCs. Erstelle zuerst eine Welt unter Welten & Lore.
          </p>
          <Link
            href="/dashboard/worlds"
            className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm hover:bg-hero-vibrant transition-colors"
          >
            <Globe className="h-4 w-4" />
            Welten & Lore
          </Link>
        </div>
      ) : (
      <form action={createCampaignAction} className="space-y-6" suppressHydrationWarning={true}>
        {/* Basis-Welt (Pflicht) */}
        <div>
          <label
            htmlFor="world_id"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Basis-Welt *
          </label>
          <select
            id="world_id"
            name="world_id"
            required
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          >
            <option value="">-- Welt wählen --</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <p className="mt-1 font-libre text-xs text-gray-500">
            Lore und NPCs dieser Kampagne gehören zur gewählten Welt.
          </p>
        </div>

        {/* Campaign Name */}
        <div>
          <label
            htmlFor="name"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Kampagnenname *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="z.B. Die verlorenen Ruinen"
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          />
        </div>

        {/* Game System */}
        <div>
          <label
            htmlFor="system"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Spielsystem *
          </label>
          <select
            id="system"
            name="system"
            required
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          >
            <option value="">-- System wählen --</option>
            <option value="dnd5e">D&D 5e</option>
            <option value="pf2e">Pathfinder 2e</option>
            <option value="coc">Call of Cthulhu</option>
            <option value="sw_eote">Star Wars: Edge of the Empire</option>
            <option value="fate">FATE</option>
            <option value="savage_worlds">Savage Worlds</option>
            <option value="other">Anderes</option>
          </select>
        </div>

        {/* Mode */}
        <div>
          <label
            htmlFor="mode"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Spielmodus
          </label>
          <select
            id="mode"
            name="mode"
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          >
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>

        {/* Max Players */}
        <div>
          <label
            htmlFor="max_players"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Maximale Spieleranzahl
          </label>
          <input
            type="number"
            id="max_players"
            name="max_players"
            defaultValue={6}
            min={1}
            max={20}
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Beschreibung
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            placeholder="Eine kurze Einführung in deine Welt..."
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none resize-none"
            suppressHydrationWarning={true}
          />
        </div>

        {/* First Session Date */}
        <div>
          <label
            htmlFor="first_session_date"
            className="block mb-2 font-barlow font-bold uppercase text-sm text-gray-300"
          >
            Erstes Spieltreffen (Optional)
          </label>
          <input
            type="datetime-local"
            id="first_session_date"
            name="first_session_date"
            className="w-full bg-slate-900 border border-hero-dark text-white rounded p-3 focus:border-hero-vibrant outline-none"
            suppressHydrationWarning={true}
          />
          <p className="mt-1 font-libre text-xs text-gray-500">
            💡 Ein geplanter erster Termin macht deine Kampagne auf der Landing Page sichtbar.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full rounded-md border border-hero-border bg-hero-dark px-6 py-3 font-barlow font-bold uppercase text-white text-sm shadow-lg transition-transform hover:scale-105 hover:bg-hero-vibrant"
          suppressHydrationWarning={true}
        >
          Kampagne erstellen
        </button>
      </form>
      )}
    </div>
  );
}

