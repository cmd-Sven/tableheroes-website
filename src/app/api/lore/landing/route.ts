import { NextResponse } from "next/server";
import { getHomepagePublicLoreGroups } from "@/src/lib/queries/public-seo-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await getHomepagePublicLoreGroups(6);
    return NextResponse.json({ groups });
  } catch (e: unknown) {
    console.error("[api/lore/landing]", e);
    return NextResponse.json({ groups: [] }, { status: 500 });
  }
}
