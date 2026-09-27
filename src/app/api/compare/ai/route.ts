import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getDailyChart } from "@/lib/tsetmc";
import { chatJSON, aiConfigured } from "@/lib/ai";
import { computeSummary } from "@/lib/indicators";
import type { CompareRow } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `تو تحلیلگر ارشد بورس تهران هستی. داده‌های واقعی ۲-۳ نماد برای مقایسه به تو داده می‌شود.
یک مقایسه‌ی منصفانه و مستند بنویس: برنده هر محور را با استناد به عددها مشخص کن (ارزش‌گذاری، مومنتوم تکنیکال، پول و حجم، عملکرد).
از عددهای خارج از داده استفاده نکن. قطعیت ممنوع.
فقط JSON برگردان: {"winner":"نماد برنده","reasons":["۲-۳ دلیل مستند"],"verdict":"۳-۴ جمله جمع‌بندی مقایسه"}`;

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (codes.length < 2 || !aiConfigured())
    return NextResponse.json({ ok: false, error: "بدون داده یا کلید" }, { status: 400 });

  try {
    const digest = [];
    for (const code of codes) {
      try {
        const [quote, candles] = await Promise.all([getQuote(code), getDailyChart(code, 260)]);
        const s = computeSummary(candles, candles);
        digest.push({
          symbol: quote.symbol,
          price: quote.last,
          todayPct: Math.round(quote.lastPct * 100) / 100,
          eps: quote.eps,
          pe: quote.eps && quote.eps > 0 ? Math.round((quote.last / quote.eps) * 10) / 10 : null,
          sectorPE: quote.sectorPE,
          rsi: s.rsi14 !== null ? Math.round(s.rsi14) : null,
          maState: s.maState,
          mfi: s.mfi14,
          monthPct: s.monthPct !== null ? Math.round(s.monthPct) : null,
          quarterPct: s.quarterPct !== null ? Math.round(s.quarterPct) : null,
          fromYearHighPct: s.fromYearHighPct !== null ? Math.round(s.fromYearHighPct) : null,
          volRatio: s.volRatio !== null ? Math.round(s.volRatio * 100) / 100 : null,
        });
      } catch {
        /* skip */
      }
    }
    const res = await chatJSON<{ winner: string; reasons: string[]; verdict: string }>({
      system: SYSTEM,
      user: JSON.stringify(digest),
      model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
      temperature: 0.2,
      maxTokens: 1200,
    });
    return NextResponse.json({ ok: true, data: { ...res, symbols: digest.map((d) => d.symbol) } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
