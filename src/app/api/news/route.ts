import { NextResponse } from "next/server";
import { fetchMarketNews } from "@/lib/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await fetchMarketNews();
    return NextResponse.json({
      ok: true,
      data: {
        news: all.slice(0, 60).map((n) => ({
          title: n.title,
          link: n.link,
          source: n.source,
          pubDate: n.pubDate,
          description: n.description,
        })),
        updatedAt: Date.now(),
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
