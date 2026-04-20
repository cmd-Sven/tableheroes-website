/**
 * Macht Werte RSC-/Flight-sicher: entfernt nicht serialisierbare Typen (z. B. undefined,
 * BigInt → Number, schluckt typische JSONB-/DB-Strukturen zu reinen JSON-Objekten).
 */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => {
      if (v === undefined) return null;
      if (typeof v === "bigint") return Number(v);
      return v;
    }),
  ) as T;
}
