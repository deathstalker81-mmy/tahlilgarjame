import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getDailyChart } from "@/lib/tsetmc";
import { computeSummary } from "@/lib/indicators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface CompareRow {
  insCode: string;
  symbol: string;
  name: string;
  type: string;
  price: number;
  lastPct: number;
  closing: number;
  eps: number | null;
  pe: number | null;
  sectorPE: number | null;
  sectorName: string | null;
  rsi: number | null;
  maState: string;
  stoch: { k: number; d: number } | null;
  mfi: number | null;
  monthPct: number | null;
  quarterPct: number | null;
  fromYearHighPct: number | null;
  volRatio: number | null;
  volume: number;
}

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (codes.length < 2) return NextResponse.json({ ok: false, error: "حداقل ۲ نماد لازم است" }, { status: 400 });

  try {
    const rows: CompareRow[] = [];
    for (const code of codes) {
      try {
        const [quote, candles] = await Promise.all([getQuote(code), getDailyChart(code, 260)]);
        const s = computeSummary(candles, candles);
        rows.push({
          insCode: code,
          symbol: quote.symbol,
          name: quote.name,
          type: quote.type,
          price: quote.last,
          lastPct: Math.round(quote.lastPct * 100) / 100,
          closing: quote.closing,
          eps: quote.eps,
          pe: quote.eps && quote.eps > 0 ? Math.round((quote.last / quote.eps) * 10) / 10 : null,
          sectorPE: quote.sectorPE,
          sectorName: quote.sectorName,
          rsi: quote.type === "سهم" ? s.rsi14 : null,
          maState: s.maState,
          stoch: s.stoch,
          mfi: s.mfi14,
          monthPct: s.monthPct !== null ? Math.round(s.monthPct * 10) / 10 : null,
          quarterPct: s.quarterPct !== null ? Math.round(s.quarterPct * 10) / 10 : null,
          fromYearHighPct: s.fromYearHighPct !== null ? Math.round(s.fromYearHighPct * 10) / 10 : null,
          volRatio: s.volRatio !== null ? Math.round(s.volRatio * 100) / 100 : null,
          volume: quote.volume,
        });
      } catch {
        /* skip broken symbol */
      }
    }
    if (rows.length < 2) return NextResponse.json({ ok: false, error: "نمادهای کافی قابل دریافت نبود" }, { status: 502 });
    return NextResponse.json({ ok: true, data: { rows, updatedAt: Date.now() } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
