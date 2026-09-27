import { NextResponse } from "next/server";
import { scanMarket, type ScanResult } from "@/lib/scanner";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ScanResponse {
  results: ScanResult[];
  aiNote: string | null;
  aiError: string | null;
  scannedCount: number;
  updatedAt: number;
}

let cache: { t: number; data: ScanResponse } | null = null;
const TTL = 30 * 60 * 1000;

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  try {
    if (!force && cache && Date.now() - cache.t < TTL) {
      return NextResponse.json({ ok: true, data: cache.data });
    }
    if (!aiConfigured()) {
      return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });
    }

    const results = await scanMarket();
    /* سهم‌هایی که فاندامنتالشون فروش گفته = از پیشنهاد حذف می‌شوند و پرچم می‌خورند */
    const flagged = results.filter((r) => r.fundVerdict === "فروش");
    const clean = results.filter((r) => r.fundVerdict !== "فروش");
    let aiNote: string | null = null;
    let aiError: string | null = null;

    if (clean.length > 0) {
      try {
        const res = await chatJSON<{ note: string; picks: { symbol: string; why: string }[] }>({
          system: `تو استراتژیست ارشد بورس تهران هستی. نتایج اسکن ماشینی تکنیکال (امتیازدهی قطعی) به تو داده می‌شود — برترین سهم‌ها با دلایل مستند.
یک جمع‌بندی بازار (۳-۴ جمله: آیا شرایط ورود خوبیه؟ کجاها متمرکز شد؟ ریسک‌ها؟) و ۳ انتخاب برتر با دلیل کوتاه بده.
فقط JSON: {"note":"...","picks":[{"symbol":"...","why":"یک جمله"}]}`,
          user: JSON.stringify(clean.slice(0, 10).map((r) => ({ symbol: r.symbol, score: r.score, reasons: r.reasons, monthPct: r.monthPct, rsi: r.rsi, fundVerdict: r.fundVerdict }))),
          model: process.env.AI_MODEL_DEEP || "gpt-4.1-mini",
          temperature: 0.3,
          maxTokens: 900,
        });
        aiNote = JSON.stringify({ note: res.note, picks: res.picks });
        if (flagged.length > 0) {
          aiNote = JSON.stringify({
            note: res.note + ` توجه: ${flagged.map((f) => f.symbol).join("، ")} از پیشنهاد حذف شدند چون تحلیل فاندامنتال‌شان «فروش» بود.`,
            picks: res.picks,
          });
        }
      } catch (err) {
        aiError = err instanceof Error ? err.message : String(err);
      }
    }

    const data: ScanResponse = { results, aiNote, aiError, scannedCount: results.length, updatedAt: Date.now() };
    cache = { t: Date.now(), data };
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
