/**
 * Loads existing NPCs for narrative hooks and tracks missing relations.
 */
"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { NarrativeHook } from "@/src/types/npc";
import {
  findNPCByName,
  checkNPCRelationExists,
} from "@/src/app/dashboard/campaigns/[id]/npc-relations-actions";
import { fuzzyNameMatch } from "./fuzzyNameMatch";

export function useNpcHookRelations(options: {
  narrativeHooks: NarrativeHook[];
  campaignId: string;
  npcId: string;
  setExistingNPCs: Dispatch<
    SetStateAction<Record<string, { id: string; name: string }>>
  >;
  setNpcsWithoutRelation: Dispatch<SetStateAction<Set<string>>>;
  setHiddenHooks: Dispatch<SetStateAction<Set<string>>>;
}) {
  const {
    narrativeHooks,
    campaignId,
    npcId,
    setExistingNPCs,
    setNpcsWithoutRelation,
    setHiddenHooks,
  } = options;

  useEffect(() => {
    const loadExistingNPCs = async () => {
      if (narrativeHooks.length === 0) return;

      const npcMap: Record<string, { id: string; name: string }> = {};
      const withoutRelation = new Set<string>();
      const hooksToHide = new Set<string>();

      const { getNPCRelations } = await import(
        "@/src/app/dashboard/campaigns/[id]/npc-relations-actions"
      );
      let existingRelations: Array<{
        partnerName: string;
        partnerId: string | null;
        isHook?: boolean;
      }> = [];
      try {
        existingRelations = await getNPCRelations(campaignId, npcId);
      } catch (error) {
        console.error("Fehler beim Laden der Relationen:", error);
      }

      const linkedHookNames = existingRelations
        .filter((rel) => rel.isHook)
        .map((rel) => rel.partnerName.toLowerCase().trim());

      const linkedNPCIds = new Set(
        existingRelations
          .filter((rel) => !rel.isHook && rel.partnerId)
          .map((rel) => rel.partnerId!.toLowerCase().trim()),
      );

      const linkedNPCNames = existingRelations
        .filter((rel) => !rel.isHook && rel.partnerName)
        .map((rel) => rel.partnerName.toLowerCase().trim());

      for (const hook of narrativeHooks) {
        if (hook.name) {
          const hookNameLower = hook.name.toLowerCase().trim();

          const isHookLinked = linkedHookNames.some((linkedName) =>
            fuzzyNameMatch(hookNameLower, linkedName),
          );

          if (isHookLinked) {
            hooksToHide.add(hook.name);
            continue;
          }

          const isNPCAlreadyLinked = linkedNPCNames.some((linkedName) =>
            fuzzyNameMatch(hookNameLower, linkedName),
          );

          if (isNPCAlreadyLinked) {
            hooksToHide.add(hook.name);
            continue;
          }

          try {
            const existing = await findNPCByName(campaignId, hook.name);
            if (existing && existing.id && existing.name) {
              const existingNameLower = existing.name.toLowerCase().trim();

              const isAlreadyLinkedByName = linkedNPCNames.some((linkedName) =>
                fuzzyNameMatch(existingNameLower, linkedName),
              );

              if (
                isAlreadyLinkedByName ||
                linkedNPCIds.has(existing.id.toLowerCase().trim())
              ) {
                hooksToHide.add(hook.name);
                continue;
              }

              npcMap[hook.name] = { id: existing.id, name: existing.name };

              const relationExists = await checkNPCRelationExists(
                campaignId,
                npcId,
                existing.id,
              );

              if (!relationExists) {
                withoutRelation.add(hook.name);
              }
            }
          } catch (error) {
            console.error(`Fehler beim Prüfen von NPC "${hook.name}":`, error);
          }
        }
      }

      setExistingNPCs(npcMap);
      setNpcsWithoutRelation(withoutRelation);
      setHiddenHooks(hooksToHide);
    };

    loadExistingNPCs();
  }, [
    narrativeHooks,
    campaignId,
    npcId,
    setExistingNPCs,
    setNpcsWithoutRelation,
    setHiddenHooks,
  ]);
}
