import { NextResponse } from "next/server";
import { getMarketOverview, getMovers, getSectorPerformance } from "@/lib/tsetmc";
import { fetchMarketNews } from "@/lib/news";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Digest {
  mood: "مثبت" | "منفی" | "خنثی";
  headline: string;
  summary: string;
  highlights: { text: string; tag: string; ref: number | null; link?: string }[];
}

const SYSTEM = `تو سردبیر ارشد خبرگزاری بورس تهران هستی و «گزارش روز بازار» می‌نویسی.
داده‌های واقعی امروز به تو داده می‌شود: شاخص‌ها، برترین‌ها، صنعت‌های برتر/ضعیف، اخبار رسانه‌ها.

قواعد دقت:
۱. headline: یک تیتر دقیق (حداکثر ۱۲ کلمه) — با اعداد واقعی داده‌شده (مثلا درصد تغییر شاخص)
۲. summary: ۲-۳ جمله منسجم: شاخص چطور بود، بازار چقدر معامله داشت، دلیلش از اخبار (اگر معلوم است)
۳. highlights: ۴ نکته مهم روز — هرکدام یک جمله دقیق با عدد واقعی، و:
   - "ref": اگر بر پایه یکی از اخبار رسانه‌ای است، شماره آن خبر؛ اگر از داده‌های شاخص/صنعت است null
   - "tag": یکی از: بورس | صنعت | ارز و طلا | کالا | جهانی | شرکت
۴. هیچ عددی از خودت نساز.
فقط JSON: {"mood":"مثبت|منفی|خنثی","headline":"...","summary":"...","highlights":[{"text":"...","tag":"...","ref":عدد یا null}]}`;

let cachedAt = 0;
let cachedData: unknown = null;
const TTL = 60 * 60 * 1000;

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedAt < TTL) {
      return NextResponse.json({ ok: true, data: cachedData });
    }

    const [overview, movers, news, sectors] = await Promise.all([
      getMarketOverview(),
      getMovers(),
      fetchMarketNews(),
      getSectorPerformance().catch(() => []),
    ]);

    const indexPct = overview.indexLastValue - overview.indexChange !== 0
      ? Math.round((overview.indexChange / (overview.indexLastValue - overview.indexChange)) * 10000) / 100
      : 0;
    const eqwPct = overview.indexEqualWeightedLastValue - overview.indexEqualWeightedChange !== 0
      ? Math.round((overview.indexEqualWeightedChange / (overview.indexEqualWeightedLastValue - overview.indexEqualWeightedChange)) * 10000) / 100
      : 0;

    /* تعطیلی هفتگی: پنجشنبه/جمعه = گزارش «آخرین روز معاملاتی» */
    const tehranDay = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Tehran" }).format(new Date());
    const isClosedDay = tehranDay === "Thursday" || tehranDay === "Friday";
    const dataDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long" }).format(
      (() => {
        const s = String(overview.marketActivityDEven ?? "");
        return s.length === 8 ? new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T12:00:00Z`) : new Date();
      })(),
    );

    const facts = {
      index: { value: Math.round(overview.indexLastValue), changeUnits: Math.round(overview.indexChange), changePct: indexPct, equalWeightedPct: eqwPct },
      marketState: overview.marketStateTitle,
      tradeValueToman: Math.round(overview.marketActivityQTotCap / 10),
      tradeCount: overview.marketActivityZTotTran,
      topGainers: movers.gainers.slice(0, 5).map((g) => `${g.symbol} (+${g.lastPct.toFixed(1)}%)`),
      topLosers: movers.losers.slice(0, 5).map((g) => `${g.symbol} (${g.lastPct.toFixed(1)}%)`),
      topValue: movers.active.slice(0, 5).map((g) => g.symbol),
      bestSectors: sectors.slice(0, 3).map((s) => `${s.name} (+${s.pct}%)`),
      worstSectors: sectors.slice(-3).reverse().map((s) => `${s.name} (${s.pct}%)`),
      latestHeadlines: news.slice(0, 14).map((n) => n.title),
    };

    let digest: Digest | null = null;
    let aiError: string | null = null;

    if (aiConfigured()) {
      try {
        const raw = await chatJSON<Digest>({
          system: SYSTEM + (isClosedDay ? `\n\nمهم: امروز (${tehranDay}) بازار تعطیل است — گزارش را برای «آخرین روز معاملاتی» بنویس، نه امروز.` : ""),
          user: JSON.stringify({ facts, newsIndex: news.slice(0, 14).map((n, i) => `${i}. [${n.source}] ${n.title}`) }),
          model: process.env.AI_MODEL_DEEP || "gpt-4.1-mini",
          temperature: 0.3,
          maxTokens: 1100,
        });
        /* اتصال هایلایت‌ها به خبرهای واقعی (با لینک) */
        digest = {
          ...raw,
          highlights: (raw.highlights ?? []).slice(0, 4).map((h) => ({
            text: h.text,
            tag: h.tag || "بورس",
            ref: typeof h.ref === "number" && news[h.ref] ? h.ref : null,
            link: typeof h.ref === "number" && news[h.ref] ? news[h.ref].link : undefined,
          })),
        };
      } catch (err) {
        aiError = err instanceof Error ? err.message : String(err);
      }
    } else {
      aiError = "NO_KEY";
    }

    cachedData = {
      digest,
      facts: { indexPct, eqwPct, tradeValueToman: facts.tradeValueToman, tradeCount: facts.tradeCount },
      isClosedDay,
      dataDate,
      aiError,
      updatedAt: Date.now(),
    };
    cachedAt = Date.now();
    return NextResponse.json({ ok: true, data: cachedData });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
