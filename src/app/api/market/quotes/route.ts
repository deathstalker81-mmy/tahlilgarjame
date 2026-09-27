import { NextResponse, type NextRequest } from "next/server";
import { getQuotesByCodes } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** قیمت لحظه‌ای نمادهای مشخص (برای دیده‌بان) — از جدول بازار کش‌شده */
export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (codes.length === 0) return NextResponse.json({ ok: true, data: { quotes: [] } });
  try {
    const rows = await getQuotesByCodes(codes);
    const quotes = codes
      .map((c) => rows.find((r) => r.insCode === c))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .map((r) => ({
        insCode: r.insCode,
        symbol: r.symbol,
        name: r.name,
        last: r.last,
        lastPct: r.lastPct,
        closingPct: r.closingPct,
        closing: r.closing,
      }));
    return NextResponse.json({ ok: true, data: { quotes } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
