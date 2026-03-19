import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    // Legacy-Parameter aus verschiedenen Einstiegspunkten (Fraktion, GM-Inbox, Orte, ...)
    prefillRole?: string;
    locationId?: string;
    name?: string;
    factionId?: string;
    description?: string;
    // Kampagnen-NPC-Route (`/dashboard/campaigns/[id]/npcs/new`) leitet mit diesen Parametern hierher um
    prefill_name?: string;
    prefill_relationship?: string;
    prefill_description?: string;
  }>;
};

export default async function WorldNewNPCPage({ params, searchParams }: Props) {
  const { id: worldId } = await params;
  const sp = await searchParams;

  // Mapping der Legacy-Parameter auf das neue Wizard-Route-Schema (/npcs/create)
  const q = new URLSearchParams();

  // Ort bleibt identisch
  if (sp.locationId) q.set("locationId", sp.locationId);

  // Name kann aus mehreren Quellen kommen (Fraktion: name, Kampagnen-Route: prefill_name)
  const prefillName = sp.name || sp.prefill_name;
  if (prefillName) {
    q.set("prefillName", prefillName);
  }

  // Fraktion: Nach NPC-Erstellung planned_member mit diesem NPC verknüpfen
  if (sp.factionId) {
    q.set("factionId", sp.factionId);
  }

  const query = q.toString();

  redirect(`/dashboard/worlds/${worldId}/npcs/create${query ? `?${query}` : ""}`);
}
