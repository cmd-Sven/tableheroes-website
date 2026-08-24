/**
 * Campaign NPC detail page — composed from npc-detail sections.
 */
"use client";

import type { NPCDetailPageProps } from "./npc-detail/types";
import { useNPCDetailPage } from "./npc-detail/useNPCDetailPage";
import { NPCDetailToolbar } from "./npc-detail/NPCDetailToolbar";
import { NPCDetailIdentityCard } from "./npc-detail/NPCDetailIdentityCard";
import { NPCDetailContentTabs } from "./npc-detail/NPCDetailContentTabs";
import { NPCDetailStorySections } from "./npc-detail/NPCDetailStorySections";
import { NPCDetailNotesSidebar } from "./npc-detail/NPCDetailNotesSidebar";
import { NPCDetailModals } from "./npc-detail/NPCDetailModals";

export type { NPCDetailPageProps } from "./npc-detail/types";

export function NPCDetailPage(props: NPCDetailPageProps) {
  const c = useNPCDetailPage(props);

  return (
    <div className="space-y-6">
      <NPCDetailToolbar c={c} />
      <NPCDetailIdentityCard c={c} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <NPCDetailContentTabs c={c} />
          <NPCDetailStorySections c={c} />
        </div>
        <NPCDetailNotesSidebar c={c} />
      </div>

      <NPCDetailModals c={c} />
    </div>
  );
}
