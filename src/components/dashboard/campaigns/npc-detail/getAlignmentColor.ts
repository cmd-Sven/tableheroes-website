/**
 * Alignment badge color classes for NPC detail.
 */
export function getAlignmentColor(alignment: string | null): string {
  if (!alignment) return "bg-gray-800/50 text-gray-300 border-gray-700";
  const colors: Record<string, string> = {
    "Lawful Good": "bg-blue-900/50 text-blue-300 border-blue-700",
    "Neutral Good": "bg-green-900/50 text-green-300 border-green-700",
    "Chaotic Good": "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    "Lawful Neutral": "bg-slate-900/50 text-slate-300 border-slate-700",
    "True Neutral": "bg-gray-900/50 text-gray-300 border-gray-700",
    "Chaotic Neutral": "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    "Lawful Evil": "bg-red-900/50 text-red-300 border-red-700",
    "Neutral Evil": "bg-orange-900/50 text-orange-300 border-orange-700",
    "Chaotic Evil": "bg-purple-900/50 text-purple-300 border-purple-700",
  };
  return colors[alignment] || "bg-gray-800/50 text-gray-300 border-gray-700";
}
