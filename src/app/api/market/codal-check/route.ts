import { NextResponse, type NextRequest } from "next/server";
import { fetchCodalLetters } from "@/lib/codal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** جدیدترین اطلاعیه‌های کدال چند نماد (برای هشدار زنده دیده‌بان) */
export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (symbols.length === 0) return NextResponse.json({ ok: true, data: { bySymbol: {} } });

  try {
    const results = await Promise.allSettled(symbols.map((s) => fetchCodalLetters(s, 8)));
    const bySymbol: Record<string, { tracingNo: number; title: string; url: string; pubDate: number; category: string; important: boolean }[]> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        bySymbol[symbols[i]] = r.value.map((l) => ({
          tracingNo: l.tracingNo,
          title: l.title,
          url: l.url,
          pubDate: l.pubDate,
          category: l.category,
          important: l.important,
        }));
      }
    });
    return NextResponse.json({ ok: true, data: { bySymbol } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
