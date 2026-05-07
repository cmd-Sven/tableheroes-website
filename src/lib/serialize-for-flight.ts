/**
 * Macht Werte RSC-/Flight-sicher: entfernt nicht serialisierbare Typen (z. B. undefined,
 * BigInt → Number, Date → ISO-String, schluckt typische JSONB-/DB-Strukturen zu reinen JSON-Objekten).
 */
export function serializeForClient<T>(value: T): T {
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) => {
        if (v === undefined) return null;
        if (typeof v === "bigint") return Number(v);
        if (typeof v === "function" || typeof v === "symbol") return undefined;
        if (typeof v === "object" && v !== null && !Array.isArray(v)) {
          if (Object.prototype.toString.call(v) === "[object Date]") {
            return (v as Date).toISOString();
          }
        }
        return v;
      }),
    ) as T;
  } catch (e) {
    console.error("[serializeForClient] JSON stringify failed, falling back to structured clone walk:", e);
    return walkSerialize(value) as T;
  }
}

function walkSerialize(v: unknown, path: Set<object> = new Set(), depth = 0): unknown {
  if (depth > 80) return null;
  if (v === null) return null;
  const t = typeof v;
  if (t === "bigint") return Number(v);
  if (t === "undefined" || t === "function" || t === "symbol") return null;
  if (t !== "object") return v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map((x) => walkSerialize(x, path, depth + 1));
  const obj = v as object;
  if (path.has(obj)) return null;
  path.add(obj);
  const out: Record<string, unknown> = {};
  try {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = walkSerialize(val, path, depth + 1);
    }
  } finally {
    path.delete(obj);
  }
  return out;
}
