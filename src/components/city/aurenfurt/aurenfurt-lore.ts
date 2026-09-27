export type AurenfurtPlaceLore = {
  name: string;
  description: string | null;
  imageUrl: string | null;
};

export function loreExcerpt(description: string | null | undefined, fallback: string) {
  const text = (description ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? text;
  if (sentence.length <= 180) return sentence;
  return `${sentence.slice(0, 177).trimEnd()}…`;
}

export function findPlaceLore(places: AurenfurtPlaceLore[], name: string) {
  const key = name.trim().toLowerCase();
  return places.find((place) => place.name.trim().toLowerCase() === key) ?? null;
}
