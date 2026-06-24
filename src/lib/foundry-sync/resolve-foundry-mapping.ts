import {
  actorIdVariants,
  normalizeFoundryActorId,
  pickBestFoundryMapping,
} from "./foundry-actor-id";

export type FoundryCharacterMappingRow = {
  id: string;
  campaign_id: string;
  foundry_actor_id: string;
  character_id: string | null;
};

export async function resolveFoundryCharacterMapping(
  supabase: { from: (table: string) => unknown },
  campaignId: string,
  actorId: string,
): Promise<
  | { ok: true; mapping: FoundryCharacterMappingRow; characterId: string }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const variants = actorIdVariants(actorId);
  const { data: mappingRowsRaw, error: mappingError } = await (supabase as any)
    .from("foundry_character_mapping")
    .select("id, campaign_id, foundry_actor_id, character_id")
    .eq("campaign_id", campaignId)
    .in("foundry_actor_id", variants);

  if (mappingError) {
    return {
      ok: false,
      status: 500,
      body: { error: "Foundry mapping lookup failed." },
    };
  }

  const mapping = pickBestFoundryMapping(
    (mappingRowsRaw ?? []) as FoundryCharacterMappingRow[],
    actorId,
  );

  if (!mapping?.character_id) {
    if (!mapping) {
      const canonicalId = normalizeFoundryActorId(actorId);
      const { error: insertError } = await (supabase as any)
        .from("foundry_character_mapping")
        .insert({
          campaign_id: campaignId,
          foundry_actor_id: canonicalId,
          character_id: null,
        });

      if (insertError) {
        return {
          ok: false,
          status: 500,
          body: { error: "Unmapped character placeholder could not be created." },
        };
      }
    }

    return {
      ok: false,
      status: 202,
      body: {
        status: "unmapped_character",
        message: "Foundry actor ist noch keinem Table-Heroes-Charakter zugeordnet.",
        campaign_id: campaignId,
        foundry_actor_id: normalizeFoundryActorId(actorId),
      },
    };
  }

  return {
    ok: true,
    mapping,
    characterId: String(mapping.character_id),
  };
}
