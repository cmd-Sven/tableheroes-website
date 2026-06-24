const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "signup",
  "dashboard",
  "onboarding",
  "kodex",
  "impressum",
  "datenschutz",
  "support",
  "campaigns",
  "api",
  "profile",
  "session",
  "images",
  "favicon",
  "robots",
  "sitemap",
]);

/** URL-Slug aus Anzeigenamen, z. B. „Falghrik Gleidahr“ → falghrik-gleidahr */
export function slugifyEntityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export async function generateUniqueEntitySlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyEntityName(name);
  if (!base) throw new Error("Name ergibt keinen gültigen URL-Slug.");

  let candidate = base;
  if (isReservedSlug(candidate)) {
    candidate = `${base}-lore`;
  }

  let suffix = 0;
  while (await isTaken(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
