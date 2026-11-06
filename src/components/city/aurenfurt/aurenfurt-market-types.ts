/**
 * Marktpreis-Körbe und Index-Typen (Basis 100 am HISTORY_START).
 * Einsatz: aurenfurt-market.ts und MarketChartPanel.
 */

export const MARKET_BASKETS = [
  "food",
  "raw",
  "luxury",
  "arms",
  "vattrak",
  "malanthir",
] as const;

export type MarketBasket = (typeof MARKET_BASKETS)[number];

export const MARKET_BASKET_LABELS: Record<MarketBasket, string> = {
  food: "Lebensmittel",
  raw: "Rohstoffe",
  luxury: "Luxusgüter",
  arms: "Waffen & Rüstung",
  vattrak: "Vattrak-Erz (legal)",
  malanthir: "Malanthir (Schwarzmarkt)",
};

export type MarketIndexPoint = {
  day: string;
  food: number;
  raw: number;
  luxury: number;
  arms: number;
  vattrak: number;
  malanthir: number;
};

export type DistrictMarketSnapshot = MarketIndexPoint & {
  districtId: string | "city";
};
