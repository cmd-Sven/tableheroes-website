/**
 * Macht Werte RSC-/Flight-sicher: entfernt nicht serialisierbare Typen (z. B. undefined,
 * schluckt typische JSONB-/DB-Strukturen zu reinen JSON-Objekten).
 */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (v === undefined ? null : v)),
  ) as T;
}
