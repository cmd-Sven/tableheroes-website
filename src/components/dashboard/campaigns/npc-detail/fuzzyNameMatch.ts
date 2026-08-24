/**
 * Fuzzy name match for narrative hooks vs existing NPCs.
 */
export function fuzzyNameMatch(hookName: string, npcName: string): boolean {
  const hookLower = hookName.toLowerCase().trim();
  const npcLower = npcName.toLowerCase().trim();

  if (!hookLower || !npcLower) return false;
  if (hookLower === npcLower) return true;
  if (hookLower.includes(npcLower)) return true;
  if (npcLower.includes(hookLower)) return true;

  const hookWords = hookLower.split(/\s+/);
  const npcWords = npcLower.split(/\s+/);

  for (const npcWord of npcWords) {
    if (
      npcWord.length > 2 &&
      hookWords.some(
        (hw) => hw === npcWord || hw.includes(npcWord) || npcWord.includes(hw),
      )
    ) {
      return true;
    }
  }

  return false;
}
