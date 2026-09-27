import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/tsetmc";
import { chatJSON, aiConfigured } from "@/lib/ai";
import { fetchMarketNews, fetchSymbolNews } from "@/lib/news";
import { fetchCodalLetters } from "@/lib/codal";
import { fundamentalStore, type FundamentalAiData } from "@/lib/analysis-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface KeptNews {
  i: number;
  category: string;
  sentiment: "مثبت" | "منفی" | "خنثی";
  impact: number;
  reason: string;
}

interface Claim {
  text: string;
  evidence: string;
}

interface Analysis {
  score: number;
  conclusion: "خرید" | "هولد" | "فروش";
  confidence: number;
  summary: string;
  positives: Claim[];
  negatives: Claim[];
  risks: string[];
  horizon: string;
  verified?: { checked: number; removed: number };
}

interface TaggedNews {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  category: string;
  sentiment: "مثبت" | "منفی" | "خنثی";
  impact: number;
  reason: string;
  scope: "سهم" | "کلان";
}

interface FundamentalData {
  financials: {
    symbol: string;
    name: string;
    price: number;
    lastPct: number;
    eps: number | null;
    pe: string | null;
    sectorName: string | null;
    sectorPE: number | null;
    yearMin: number | null;
    yearMax: number | null;
  };
  news: TaggedNews[];
  analysis: Analysis | null;
  aiError: string | null;
  codalCount: number;
  updatedAt: number;
}

const SYSTEM_SCREEN = `تو سردبیر ارشد خبرگزاری اقتصادی و متخصص بورس تهران هستی.
فهرستی شامل «اطلاعیه‌های رسمی کدال» و «اخبار رسانه‌ها» (شماره‌گذاری‌شده) و اطلاعات یک نماد به تو داده می‌شود.
حداکثر ۳۰ مورد مهم را نگه دار:
- اطلاعیه‌های کدال (رسمی) مهم‌ترین منبع فاندامنتال‌اند — تقریباً همه موارد مهمشان را نگه دار (مجمع، افزایش سرمایه، افشای بااهمیت، صورت‌های مالی، تقسیم سود، گزارش ماهانه)
- از اخبار رسانه‌ها، فقط مواردی که مستقیماً روی این شرکت، صنعتش یا شرایط کلان مؤثر بر سهامش اثر می‌گذارند
هر مورد را طبقه‌بندی کن (کدال-مالی/کدال-مجمع/کدال-سرمایه/مالی/قانونی/کلان/صنعت/بین‌الملل)، اثرش روی سهم را مشخص کن (مثبت/منفی/خنثی)، شدت اثر را ۰ تا ۱۰۰ بده و دلیل را فقط در یک جمله کوتاه بیاور.
اخبار تبلیغاتی، ورزشی، حاشیه‌ای و بی‌ربط را کنار بگذار.
فقط JSON معتبر برگردان: {"keep":[{"i":شماره,"category":"...","sentiment":"مثبت|منفی|خنثی","impact":عدد,"reason":"..."}]}`;

const SYSTEM_ANALYZE = `تو یک ریسرچر ارشد فاندامنتال بازار سرمایه ایران هستی که اعتبار حرفه‌ای‌اش برایش مهم‌تر از هر چیز است.
داده‌های مالی یک نماد، اخبار صحت‌سنجی‌شده (تیتر + توضیح + برچسب) و «اطلاعیه‌های رسمی کدال» به تو داده می‌شود.

قواعد انضباطی (مهم‌تر از هر چیز):
۱. فقط بر اساس داده‌های ارائه‌شده تحلیل کن. هیچ عدد مالی، درصد یا رویدادی که در داده‌ها نباشد را ذکر نکن.
۲. هر ادعا (مثبت/منفی) باید «شاهد» داشته باشد: استناد دقیق به کدام خبر، کدام اطلاعیه کدال یا کدام عدد مالی.
۳. اطلاعیه‌های رسمی کدال (officialCodalAnnouncements) معتبرترین سند فاندامنتال‌اند — تحلیل و مثبت/منفی‌ها باید تا حد امکان به آن‌ها تکیه کند و در شاهد به صراحت به «کدال» ارجاع بده.
۴. از محتوای اطلاعیه/خبر فقط همان چیزی را استفاده کن که در متن آمده — فراتر از متن حدس نزن.
۵. اگر برای نتیجه‌گیری داده کافی نیست، صریح بگو «داده کافی نیست» — حدس نزن.
۶. P/E سهم را فقط با میانگین صنعت مقایسه کن.
۷. متغیرهای کلان (ارز، نفت، ژئوپلیتیک) در بازار ایران غالب‌اند — اگر اخبار کلان مرتبط هست، اثرش را توضیح بده.
۸. احتمال‌محور صحت کن؛ قطعیت ممنوع.

فقط و فقط یک JSON معتبر:
{
  "score": ۰-۱۰۰,
  "conclusion": "خرید" | "هولد" | "فروش",
  "confidence": ۰-۱۰۰,
  "summary": "۳-۴ جمله — فقط بر اساس داده‌ها",
  "positives": [{"text":"...","evidence":"کدام خبر/اطلاعیه کدال/عدد"}],
  "negatives": [{"text":"...","evidence":"کدام خبر/اطلاعیه کدال/عدد"}],
  "risks": ["..."],
  "horizon": "افق پیشنهاد مثل: میان‌مدت ۳ تا ۶ ماه"
}`;

const VERIFY_SYSTEM = `تو بازبین سخت‌گیر تحلیل‌های فاندامنتال هستی. تحلیل و داده‌های خامِ مربوطه (اخبار با تیتر و توضیح + مالی) به تو داده می‌شود.
هر ادعا را با داده‌ها تطبیق بده:
- "wrong": ادعا با داده تناقض دارد یا چیزی خارج از داده‌ها ادعا شده
- "weak": ادعا شدنی است اما شاهدش ضعیف است (مثلاً فقط یک تیتر بدون توضیح)
- "supported": ادعا با داده‌ها سازگار و شاهدش معتبر است
اطمینان نهایی را واقع‌بینانه اصلاح کن.
فقط JSON برگردان:
{"verdicts":[{"section":"positives|negatives","index":عدد,"verdict":"supported|weak|wrong"}],"adjustedConfidence":عدد,"note":"یک جمله"}`;

const TTL = 6 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const cached = fundamentalStore.get(params.insCode);
    if (cached && Date.now() - cached.t < TTL) {
      return NextResponse.json({ ok: true, data: cached.data });
    }

    const quote = await getQuote(params.insCode);
    const financials = {
      symbol: quote.symbol,
      name: quote.name,
      price: quote.last,
      lastPct: Math.round(quote.lastPct * 100) / 100,
      eps: quote.eps,
      pe: quote.pe,
      sectorName: quote.sectorName,
      sectorPE: quote.sectorPE,
      yearMin: quote.yearMin,
      yearMax: quote.yearMax,
    };

    const [symbolNews, marketNews, codalLetters] = await Promise.all([
      fetchSymbolNews(quote.symbol, quote.name),
      fetchMarketNews(),
      fetchCodalLetters(quote.symbol || "").catch(() => []),
    ]);

    /* استخر: اطلاعیه‌های کدال (اولویت) + اخبار نماد + اخبار بازار */
    const pool: { title: string; source: string; description: string; link: string; pubDate: number }[] = [
      ...codalLetters.map((l) => ({
        title: `${l.title}`,
        source: "کدال (رسمی)",
        description: `اطلاعیه رسمی کدال — دسته: ${l.category}`,
        link: l.url,
        pubDate: l.pubDate,
      })),
      ...symbolNews,
      ...marketNews,
    ].slice(0, 110);

    let kept: KeptNews[] = [];
    let analysis: Analysis | null = null;
    let aiError: string | null = null;

    if (!aiConfigured()) {
      aiError = "NO_KEY";
    } else {
      try {
        /* مرحله ۱-۳: غربال + صحت‌سنجی + طبقه‌بندی */
        const pool = [...symbolNews, ...marketNews].slice(0, 100);
        const numbered = pool
          .map((n, idx) => `${idx}. [${n.source}] ${n.title}`)
          .join("\n");
        const screenInput = `نماد: ${quote.symbol} — ${quote.name}${quote.sectorName ? ` (گروه: ${quote.sectorName})` : ""}\n\nاخبار:\n${numbered}`;
        const screenRes = await chatJSON<{ keep: KeptNews[] }>({
          system: SYSTEM_SCREEN,
          user: screenInput,
          model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
          temperature: 0.2,
          maxTokens: 4000,
        });
        kept = (screenRes.keep ?? []).filter((k) => typeof k.i === "number");

        /* مرحله ۴-۵: تحلیل + پیشنهاد (کدال = سند رسمی + توضیحات کامل خبرها) */
        const keptCodal = kept
          .filter((k) => pool[k.i]?.source?.startsWith("کدال"))
          .map((k) => {
            const item = pool[k.i];
            const tag = kept.find((x) => x.i === k.i);
            return `[کدال|${tag?.category ?? ""}|${tag?.sentiment ?? ""}] ${item?.title ?? ""}`;
          });
        const newsForAnalysis = kept
          .map((k) => {
            const item = pool[k.i];
            return `- [${k.category}|${k.sentiment}|اثر ${k.impact}] ${item?.title ?? ""}${item?.description ? ` — توضیح: ${item.description}` : ""} — چرا مهم: ${k.reason}`;
          })
          .join("\n");
        const analyzeInput = JSON.stringify({
          financials,
          officialCodalAnnouncements: keptCodal,
          verifiedNews: newsForAnalysis,
          sentimentSummary: {
            positive: kept.filter((k) => k.sentiment === "مثبت").length,
            negative: kept.filter((k) => k.sentiment === "منفی").length,
            neutral: kept.filter((k) => k.sentiment === "خنثی").length,
          },
        });
        analysis = await chatJSON<Analysis>({
          system: SYSTEM_ANALYZE,
          user: analyzeInput,
          temperature: 0.1,
          maxTokens: 2500,
        });
        analysis.score = Math.max(0, Math.min(100, Math.round(analysis.score)));
        analysis.confidence = Math.max(0, Math.min(100, Math.round(analysis.confidence)));

        /* لایه بازبین: هر ادعا با اخبار و مالی خام تطبیق داده می‌شود */
        try {
          const rawNewsDigest = [...symbolNews, ...marketNews].slice(0, 50).map((n) => ({
            t: n.title,
            d: n.description?.slice(0, 150),
          }));
          const res = await chatJSON<{
            verdicts: { section: string; index: number; verdict: string }[];
            adjustedConfidence: number;
          }>({
            system: VERIFY_SYSTEM,
            user: JSON.stringify({
              financials,
              rawNews: rawNewsDigest,
              claims: {
                summary: analysis.summary,
                positives: analysis.positives.map((p) => p.text),
                negatives: analysis.negatives.map((p) => p.text),
              },
            }),
            model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
            temperature: 0,
            maxTokens: 1500,
          });
          const isBad = (section: string, index: number) =>
            res.verdicts?.some((v) => v.section === section && v.index === index && v.verdict === "wrong");
          const positives = (analysis.positives ?? []).filter((_, i) => !isBad("positives", i));
          const negatives = (analysis.negatives ?? []).filter((_, i) => !isBad("negatives", i));
          analysis.verified = {
            checked: (analysis.positives?.length ?? 0) + (analysis.negatives?.length ?? 0),
            removed: (analysis.positives?.length ?? 0) - positives.length + ((analysis.negatives?.length ?? 0) - negatives.length),
          };
          analysis.positives = positives;
          analysis.negatives = negatives;
          let adjusted = res.adjustedConfidence ?? analysis.confidence;
          if (adjusted <= 1) adjusted *= 100;
          analysis.confidence = Math.min(
            analysis.confidence,
            Math.max(0, Math.min(100, Math.round(adjusted))),
          );
        } catch {
          analysis.verified = { checked: 0, removed: 0 };
        }
      } catch (err) {
        aiError = err instanceof Error ? err.message : String(err);
      }
    }

    const taggedNews = kept
      .map((k) => {
        const item = pool[k.i];
        /* تفکیک قطعی بر اساس منبع: کدال/جستجوی نماد = سهم‌محور، اخبار بازار = کلان */
        const scope: "سهم" | "کلان" = k.i < codalLetters.length + symbolNews.length ? "سهم" : "کلان";
        return item
          ? { title: item.title, link: item.link, source: item.source, pubDate: item.pubDate, category: k.category, sentiment: k.sentiment, impact: k.impact, reason: k.reason, scope }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, 25);

    const data: FundamentalData = {
      financials,
      news: taggedNews,
      analysis,
      aiError,
      codalCount: codalLetters.length,
      updatedAt: Date.now(),
    };
    fundamentalStore.set(params.insCode, { t: Date.now(), data });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
