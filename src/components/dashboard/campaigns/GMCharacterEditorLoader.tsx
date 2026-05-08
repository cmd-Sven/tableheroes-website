"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GMCharacterEditorPage } from "./GMCharacterEditorPage";
import {
  loadGmCharacterEditorData,
  type GmCharacterEditorLoadPayload,
} from "@/src/app/dashboard/campaigns/[id]/characters/gm-character-editor-load-action";
import type { GMCharacterEditorPageProps } from "./GMCharacterEditorPage";

type Props = {
  campaignId: string;
  characterId: string;
  currentUserId: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "ready"; data: GmCharacterEditorLoadPayload };

export function GMCharacterEditorLoader({
  campaignId,
  characterId,
  currentUserId,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const runLoad = useCallback(async () => {
    setState({ status: "loading" });
    const result = await loadGmCharacterEditorData(campaignId, characterId);
    if (!result.ok) {
      const msg =
        result.error === "not_authenticated"
          ? "Bitte neu anmelden."
          : result.error === "forbidden"
            ? "Kein Zugriff."
            : result.error === "campaign_not_found"
              ? "Kampagne nicht gefunden."
              : "Daten konnten nicht geladen werden.";
      setState({ status: "error", message: msg });
      return;
    }
    if (result.status === "not_found") {
      setState({ status: "not_found" });
      return;
    }
    setState({ status: "ready", data: result.data });
  }, [campaignId, characterId]);

  useEffect(() => {
    void runLoad();
  }, [runLoad]);

  const backHref = `/dashboard/campaigns/${campaignId}?tab=members`;

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-lg border border-hero-dark bg-background-card p-10 font-libre text-gray-300">
        <Loader2 className="h-10 w-10 animate-spin text-hero-vibrant" aria-hidden />
        <p>Charakter wird geladen…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-6">
        <p className="font-libre text-gray-200 mb-4">{state.message}</p>
        <button
          type="button"
          onClick={() => void runLoad()}
          className="rounded border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-sm text-hero-vibrant hover:border-hero-vibrant"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-6">
        <h2 className="font-barlow font-bold text-xl text-red-400 mb-2">
          Charakter nicht gefunden
        </h2>
        <p className="font-libre text-gray-300 mb-4">
          Der Charakter konnte nicht geladen werden. Möglicherweise ist er nicht mit dieser Kampagne
          verknüpft.
        </p>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück zur Kampagne
        </Link>
      </div>
    );
  }

  const editorProps: GMCharacterEditorPageProps = {
    campaignId,
    currentUserId,
    ...state.data,
  };

  return <GMCharacterEditorPage {...editorProps} />;
}
