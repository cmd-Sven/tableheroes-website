import { createCampaignAction } from "./actions";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateCampaignPage() {
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
            Erschaffe eine neue Welt und lade deine Spieler ein.
          </p>
        </div>
      </div>

      {/* Form */}
      <form action={createCampaignAction} className="space-y-6" suppressHydrationWarning={true}>
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
    </div>
  );
}

