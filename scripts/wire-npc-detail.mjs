/**
 * Wire NPCDetailPage to extracted npc-detail helpers (types, InlineEditField, TravelQuickAction).
 */
import fs from "fs";

const src = "src/components/dashboard/campaigns/NPCDetailPage.tsx";
let text = fs.readFileSync(src, "utf8");
const lines = text.split(/\r?\n/);

// Find markers
const typeQuest = lines.findIndex((l) => l.startsWith("type Quest ="));
const exportFn = lines.findIndex((l) => l.startsWith("export function NPCDetailPage"));
const travelType = lines.findIndex((l) => l.startsWith("// Quick Action Component"));
if (typeQuest < 0 || exportFn < 0 || travelType < 0) {
  console.error("markers", typeQuest, exportFn, travelType);
  process.exit(1);
}

// Keep imports before type Quest, but drop mid-file import of NpcSceneAppearances if between types
const head = lines.slice(0, typeQuest);
// Find NpcSceneAppearances import that was between types - re-add if needed
const midImport = lines.find(
  (l) => l.includes("NpcSceneAppearances") || l.includes("scene-media-types")
);

const newImports = `import { NpcSceneAppearances } from "@/src/components/dashboard/campaigns/npcs/NpcSceneAppearances";
import type { SceneMediaAppearance } from "@/src/lib/scene-media-types";
import { InlineEditField } from "./npc-detail/InlineEditField";
import { TravelQuickAction } from "./npc-detail/TravelQuickAction";
import type { NPCDetailPageProps } from "./npc-detail/types";
import { ALIGNMENTS, NPC_STATUSES } from "./npc-detail/types";
`;

// Remove NarrativeHook from types usage - still imported from @/src/types/npc
// Rebuild: head + new imports + export function body without travel at end
let body = lines.slice(exportFn, travelType);
// Replace Props with NPCDetailPageProps
body = body.map((l) => l.replace(/}: Props\) \{/, "}: NPCDetailPageProps) {"));

const out = [...head, newImports, "", ...body].join("\n").replace(/\n+$/, "\n");
fs.writeFileSync(src, out);
console.log("NPCDetailPage lines:", out.split("\n").length);
