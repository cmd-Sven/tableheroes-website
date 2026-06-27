"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinSessionAsGuest, type JoinSessionAsGuestResult } from "@/src/app/session/guest-actions";

type JoinInfo = {
  ok: boolean;
  session_title?: string;
  campaign_name?: string;
  is_live?: boolean;
  error?: string;
};

type Props = {
  token: string;
  joinInfo: JoinInfo;
  registeredSessionUrl?: string | null;
};

export function SessionGuestJoinClient({
  token,
  joinInfo,
  registeredSessionUrl,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(joinInfo.ok ? null : joinInfo.error ?? "Link ungültig.");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (registeredSessionUrl) {
      router.replace(registeredSessionUrl);
    }
  }, [registeredSessionUrl, router]);

  if (registeredSessionUrl) {
    return (
      <p className="font-libre text-gray-300 text-center py-12">Weiterleitung zur Session…</p>
    );
  }

  if (!joinInfo.ok) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-800/50 bg-red-950/30 p-6 text-center">
        <p className="font-cinzel text-lg text-red-300 mb-2">Einladung ungültig</p>
        <p className="font-libre text-sm text-gray-400">{error}</p>
      </div>
    );
  }

  if (!joinInfo.is_live) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-hero-dark bg-background-card p-6 text-center">
        <p className="font-cinzel text-lg text-accent-gold mb-2">Noch nicht live</p>
        <p className="font-libre text-sm text-gray-300">
          Die Session <strong>{joinInfo.session_title}</strong> in{" "}
          <strong>{joinInfo.campaign_name}</strong> hat noch nicht begonnen. Bitte warte, bis der
          Spielleiter sie startet.
        </p>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result: JoinSessionAsGuestResult = await joinSessionAsGuest(token, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/session/${result.sessionId}`);
    });
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-hero-dark bg-background-card p-6 shadow-xl">
      <h1 className="font-cinzel text-2xl text-accent-gold mb-1 text-center">Live-Session beitreten</h1>
      <p className="font-libre text-sm text-gray-400 text-center mb-6">
        {joinInfo.session_title} · {joinInfo.campaign_name}
      </p>
      <p className="font-libre text-xs text-gray-500 mb-4 text-center">
        Du brauchst kein Table-Heroes-Konto. Wähle einen Anzeigenamen für deinen Platz am Tisch
        (nur Zuschauen — kein Inventar, kein Handel).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="guest-name"
            className="mb-1 block font-barlow text-xs font-bold uppercase text-gray-400"
          >
            Dein Name am Tisch
          </label>
          <input
            id="guest-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            autoFocus
            placeholder="z. B. Alex"
            className="w-full rounded-md border border-hero-dark bg-slate-900 px-3 py-2 font-libre text-white placeholder-gray-500 focus:border-hero-vibrant focus:outline-none"
          />
        </div>
        {error ? <p className="font-libre text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full rounded-md bg-hero-vibrant px-4 py-2.5 font-barlow font-bold uppercase text-sm text-white transition-colors hover:bg-hero-dark disabled:opacity-50"
        >
          {isPending ? "Beitreten…" : "Session beitreten"}
        </button>
      </form>
    </div>
  );
}
