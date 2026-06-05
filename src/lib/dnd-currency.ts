import type { ShopCatalogItem } from "@/src/lib/shop-catalog/types";

/** D&D 5e — deutsche Abkürzungen (PHB). */
export const DND_COIN_TYPES = [
  { code: "cp", label: "KM", name: "Kupfermünzen", perCopper: 1 },
  { code: "sp", label: "SM", name: "Silbermünzen", perCopper: 10 },
  { code: "ep", label: "EM", name: "Elektrummünzen", perCopper: 50 },
  { code: "gp", label: "GM", name: "Goldmünzen", perCopper: 100 },
  { code: "pp", label: "PM", name: "Platinmünzen", perCopper: 1000 },
] as const;

export type DndCoinCode = (typeof DND_COIN_TYPES)[number]["code"];

export type CoinPouch = {
  gp: number;
  sp: number;
  cp: number;
  ep: number;
  pp: number;
};

export const CP_PER_CP = 1;
export const CP_PER_SP = 10;
export const CP_PER_EP = 50;
export const CP_PER_GP = 100;
export const CP_PER_PP = 1000;

const COIN_ORDER: Array<{ key: keyof CoinPouch; cp: number; label: string }> = [
  { key: "pp", cp: CP_PER_PP, label: "PM" },
  { key: "gp", cp: CP_PER_GP, label: "GM" },
  { key: "ep", cp: CP_PER_EP, label: "EM" },
  { key: "sp", cp: CP_PER_SP, label: "SM" },
  { key: "cp", cp: CP_PER_CP, label: "KM" },
];

export function normalizeCoinAmount(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function normalizeCoinPouch(input: Partial<CoinPouch>): CoinPouch {
  return {
    gp: normalizeCoinAmount(input.gp),
    sp: normalizeCoinAmount(input.sp),
    cp: normalizeCoinAmount(input.cp),
    ep: normalizeCoinAmount(input.ep),
    pp: normalizeCoinAmount(input.pp),
  };
}

export function coinPouchToCopper(pouch: Partial<CoinPouch>): number {
  const p = normalizeCoinPouch(pouch);
  return (
    p.cp +
    p.sp * CP_PER_SP +
    p.ep * CP_PER_EP +
    p.gp * CP_PER_GP +
    p.pp * CP_PER_PP
  );
}

/** Zerlegt Kupferwert in Münzen (ohne Überlauf in höhere Stufen). */
export function copperToCoinPouch(totalCp: number): CoinPouch {
  let remaining = Math.max(0, Math.round(totalCp));
  const out: CoinPouch = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };

  for (const coin of COIN_ORDER) {
    const count = Math.floor(remaining / coin.cp);
    out[coin.key] = count;
    remaining -= count * coin.cp;
  }

  return out;
}

export function addCopperToPouch(pouch: CoinPouch, deltaCp: number): CoinPouch {
  return copperToCoinPouch(coinPouchToCopper(pouch) + Math.max(0, Math.round(deltaCp)));
}

export function subtractCopperFromPouch(
  pouch: CoinPouch,
  amountCp: number,
): { pouch: CoinPouch; ok: boolean } {
  const need = Math.max(0, Math.round(amountCp));
  const have = coinPouchToCopper(pouch);
  if (have < need) {
    return { pouch: normalizeCoinPouch(pouch), ok: false };
  }
  return { pouch: copperToCoinPouch(have - need), ok: true };
}

/** Anzeige z. B. „2 SM“, „25 GM“ — für Screenreader / Tooltips. UI nutzt DndCoinDisplay. */
export function formatCoinPouch(
  pouch: Partial<CoinPouch>,
  options?: { emptyLabel?: string },
): string {
  const normalized = normalizeCoinPouch(pouch);
  const parts = COIN_ORDER.map((coin) => ({
    label: coin.label,
    value: normalized[coin.key],
  })).filter((part) => part.value > 0);

  if (parts.length === 0) {
    return options?.emptyLabel ?? "0 KM";
  }

  return parts.map((part) => `${part.value} ${part.label}`).join(" ");
}

export type CoinDisplayPart = {
  code: DndCoinCode;
  amount: number;
  name: string;
};

export function coinPouchToDisplayParts(pouch: Partial<CoinPouch>): CoinDisplayPart[] {
  const normalized = normalizeCoinPouch(pouch);
  return COIN_ORDER.map((coin) => ({
    code: coin.key,
    amount: normalized[coin.key],
    name: DND_COIN_TYPES.find((row) => row.code === coin.key)?.name ?? coin.label,
  })).filter((part) => part.amount > 0);
}

export function copperToDisplayParts(totalCp: number): CoinDisplayPart[] {
  return coinPouchToDisplayParts(copperToCoinPouch(totalCp));
}

export function formatCopper(totalCp: number, options?: { emptyLabel?: string }): string {
  return formatCoinPouch(copperToCoinPouch(totalCp), options);
}

export function catalogItemToCopper(item: ShopCatalogItem): number {
  const gp = normalizeCoinAmount(item.priceGp);
  const sp = normalizeCoinAmount(item.priceSp);
  const cp = normalizeCoinAmount(item.priceCp);
  const ep = normalizeCoinAmount(item.priceEp);
  const pp = normalizeCoinAmount(item.pricePp);
  return gp * CP_PER_GP + sp * CP_PER_SP + cp + ep * CP_PER_EP + pp * CP_PER_PP;
}

/** DB-Feld base_price_gp kann Dezimal-Gold enthalten (z. B. 0,2 GM = 2 SM). */
export function goldFieldToCopper(basePriceGp: unknown): number {
  const gp = Number(basePriceGp ?? 0);
  if (!Number.isFinite(gp) || gp <= 0) return 0;
  return Math.max(0, Math.round(gp * CP_PER_GP));
}

export function copperToGoldField(totalCp: number): number {
  return Math.round(totalCp) / CP_PER_GP;
}

const PURCHASE_PRICE_TAG =
  /\[Shop-Kauf:\s*([\d.,]+)\s*(GM|SM|KM|EM|PM|gp|sp|cp|ep|pp)\]/i;

const LEGACY_PURCHASE_GP_TAG = /\[Shop-Kauf:\s*(\d+)\s*gp\]/i;

function parseCoinUnitToCopper(value: string, unit: string): number | null {
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  const u = unit.toLowerCase();
  if (u === "gm" || u === "gp") return Math.round(n * CP_PER_GP);
  if (u === "sm" || u === "sp") return Math.round(n * CP_PER_SP);
  if (u === "km" || u === "cp") return Math.round(n);
  if (u === "em" || u === "ep") return Math.round(n * CP_PER_EP);
  if (u === "pm" || u === "pp") return Math.round(n * CP_PER_PP);
  return null;
}

/** Liest den Kaufpreis aus der Inventar-Beschreibung (Kupferwert). */
export function parsePurchasePriceCopperFromDescription(
  description: string | null | undefined,
): number | null {
  if (!description) return null;

  const tagged = description.match(PURCHASE_PRICE_TAG);
  if (tagged) {
    return parseCoinUnitToCopper(tagged[1], tagged[2]);
  }

  const legacy = description.match(LEGACY_PURCHASE_GP_TAG);
  if (legacy) {
    const n = Number(legacy[1]);
    return Number.isFinite(n) && n > 0 ? Math.round(n * CP_PER_GP) : null;
  }

  return null;
}

export function formatPurchasePriceTag(totalCp: number): string {
  return `[Shop-Kauf: ${formatCopper(totalCp)}]`;
}

/** @deprecated Kassandra-Namen — nutze DND_COIN_TYPES */
export const KASSANDRA_COINS = DND_COIN_TYPES.map((coin) => ({
  code: coin.code,
  dnd: `${coin.name} (${coin.code})`,
  name: coin.label,
}));
