/**
 * Bühnen-Ruf (campaign_npc_reputation.reputation_score): nur Smiley, keine Zahl für Spieler.
 * Neutralband −5 … +5, darüber freundlicher, darunter negativer (bis sehr niedrig).
 */
export function npcReputationSmileyFromScore(raw: number): string {
  const s = Math.round(Number.isFinite(raw) ? raw : 0);

  if (s >= 86) return "🤩";
  if (s >= 66) return "😄";
  if (s >= 46) return "😁";
  if (s >= 31) return "😊";
  if (s >= 16) return "😊";
  if (s >= 6) return "🙂";
  if (s >= -5 && s <= 5) return "😐";
  if (s >= -15) return "😕";
  if (s >= -30) return "😟";
  if (s >= -45) return "😠";
  if (s >= -60) return "😡";
  if (s >= -75) return "🤬";
  return "💀";
}
