"use client";

import dynamic from "next/dynamic";
import type { GMCharacterEditorPageProps } from "./GMCharacterEditorPage";

/**
 * Next.js 16: `dynamic(..., { ssr: false })` darf nicht in Server Components stehen.
 * Der Wrapper ist Client-only; die Seite importiert nur diese Shell.
 */
const GMCharacterEditorPage = dynamic(
  () =>
    import("./GMCharacterEditorPage").then((m) => m.GMCharacterEditorPage),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-hero-dark bg-background-card p-10 text-center font-libre text-gray-300">
        Charakter-Editor wird geladen…
      </div>
    ),
  },
);

export function GMCharacterEditorPageClient(props: GMCharacterEditorPageProps) {
  return <GMCharacterEditorPage {...props} />;
}
