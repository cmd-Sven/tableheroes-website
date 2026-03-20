/**
 * Server-safe Rang- und Level-Logik (kein "use client").
 */

/**
 * Legacy-Hilfsfunktion: einfachen Rang-Namen aus Punkten ableiten.
 * Kann weiterhin für Fallbacks genutzt werden.
 */
export function getRankFromPoints(points: number): string {
  if (points >= 500) return "Legende";
  if (points >= 100) return "Abenteurer";
  return "Novize";
}

/**
 * Punkte-Schwelle für ein bestimmtes Level.
 * Progression: Level 1 = 500, Level 2 = 1100, Level 3 = 1800, Level 4 = 2600, ...
 * Formel: Summe der benötigten Punkte mit wachsendem Bedarf (+100 pro Level).
 */
function getPointsForLevelInternal(level: number): number {
  if (level <= 0) return 0;
  // Hergeleitete Formel aus der arithmetischen Reihe:
  // threshold(n) = 50 * n^2 + 450 * n
  return 50 * level * level + 450 * level;
}

/** Exportierte Version: Liefert die Punkteschwelle für Level n (für Level-Übersicht). */
export function getPointsForLevel(level: number): number {
  return getPointsForLevelInternal(level);
}

/**
 * Berechnet das Level eines Spielers basierend auf seinen Gesamtpunkten.
 * Es wird das höchste Level n gesucht, dessen Schwelle <= points ist.
 */
export function calculateLevel(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;

  let level = 0;
  const maxLevel = 100; // Sicherheitskappe

  while (level < maxLevel) {
    const nextLevel = level + 1;
    const required = getPointsForLevel(nextLevel);
    if (points < required) break;
    level = nextLevel;
  }

  return level;
}

/**
 * Liefert die absolute Punkteschwelle für das *nächste* Level.
 * Beispiel: currentLevel = 1 -> 1100, currentLevel = 2 -> 1800, ...
 */
export function getPointsForNextLevel(currentLevel: number): number {
  const safeLevel = Number.isFinite(currentLevel)
    ? Math.max(0, currentLevel)
    : 0;
  const nextLevel = safeLevel + 1;
  return getPointsForLevel(nextLevel);
}
