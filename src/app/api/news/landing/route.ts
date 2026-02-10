import { NextResponse } from "next/server";
import { getLandingPageNews } from "@/src/lib/actions/news-actions";

export async function GET() {
  try {
    const posts = await getLandingPageNews();
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error loading landing page news:", error);
    return NextResponse.json(
      { posts: [], error: "failed_to_load" },
      { status: 500 }
    );
  }
}
