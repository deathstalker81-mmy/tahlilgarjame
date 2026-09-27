import { NextResponse, type NextRequest } from "next/server";
import { getDailyChart, getQuote } from "@/lib/tsetmc";
import { chatJSON, aiConfigured } from "@/lib/ai";
import { computeSummary, detectPatterns, detectChartPatterns, detectDivergence, toWeekly, type TechSummary } from "@/lib/indicators";
import type { Candle } from "@/types/market";
import { technicalStore, getLatest, type TechnicalAiResult as AiResult } from "@/lib/analysis-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM = `تو یک تحلیلگر ارشد تکنیکال بازار سرمایه ایران هستی که مثل یک حرفه‌ای چند لایه تحلیل می‌کند و بعد تصمیم می‌گیرد.

داده‌ها (همه واقعی و محاسبه‌شده): کندل‌های OHLCV روزانه، اندیکاتورها (RSI، MACD، MA20/50، بولینگر، استوکاستیک، MFI، ATR، فیبوناچی)، سطوح حمایت/مقاومت، «واقعیت‌های تشخیص‌داده‌شده» (الگوهای کندلی + الگوهای نموداری + واگرایی‌های MACD — همه ریاضی تایید شده)، خلاصه تایم‌فریم هفتگی، و تایم‌فریم لحظه‌ای.

لایه‌های تحلیل (هرکدام را جدا بنویس):
۱. ساختار (Price Action): روند، جای قیمت نسبت به حمایت/مقاومت، الگوهای کندلی تاییدشده
۲. مومنتوم: RSI (اشباع؟)، MACD (تقاطع؟ واگرایی تاییدشده؟)، جای قیمت نسبت به میانگین‌ها
۳. الگوهای نموداری: فقط آن‌ها که در «واقعیت‌های تشخیص‌داده‌شده» هستند — الگو از خودت نساز
۴. چندتایم‌فریمی: روند هفتگی vs روزانه — مثلا «هفتگی نزولی، روزانه پتانسیل برگشت»

قواعد سخت‌گیرانه:
- فقط اعداد و سطوح داده‌شده — هیچ عددی از خودت نساز
- پلن معامله باید دقیق و منطبق بر سطوح باشد:
  * ورود: محدوده‌ای نزدیک حمایت/فیبوناچی (استناد کن)
  * حد ضرر: بیرون از نوسان معمول (با ATR منطقی کن) و زیر ساختار
  * حد سود: هدف ۱ = مقاومت نزدیک، هدف ۲ = مقاومت بعدی
  * نسبت ریسک به ریوارد: (فاصله تا هدف۱) ÷ (فاصله ورود تا حد ضرر) — عدد بده؛ زیر ۱.۵ صادقانه بنویس که به‌صرفه نیست
  * باطل‌شدن: چه اتفاقی تحلیل را باطل می‌کند
- احتمال‌محور صحت کن؛ قطعیت ممنوع

فقط و فقط یک JSON معتبر:
{
 "trend": "صعودی|نزولی|خنثی",
 "layers": {"structure":"...","momentum":"...","patterns":"... یا null","timeframes":"هفتگی: ... / روزانه: ..."},
 "summary": "جمع‌بندی ۲-۳ جمله: لایه‌ها را کنار هم بگذار و نتیجه بگیر",
 "positives": [{"text":"...","evidence":"..."}],
 "negatives": [{"text":"...","evidence":"..."}],
 "plan": {"entry":{"min":عدد,"max":عدد,"note":"نزدیک چه سطحی"},"stopLoss":عدد,"targets":[هدف۱,هدف۲],"riskReward":"مثلا ۱ به ۲.۵","invalidation":"..."},
 "conclusion": "خرید|هولد|فروش",
 "confidence": ۰-۱۰۰
}`;

const VERIFY_SYSTEM = `تو بازبین سخت‌گیر تحلیل‌های تکنیکال هستی. یک تحلیل و داده‌های خامِ مربوطه به تو داده می‌شود.
هر ادعا را با داده‌ها تطبیق بده:
- "wrong": ادعا با داده تناقض دارد یا عددی خارج از داده ذکر کرده یا الگویی را ادعا می‌کند که در واقعیت‌های تشخیص‌داده‌شده نیست
- "weak": ادعا شدنی است اما شاهدش ضعیف یا مبهم است
- "supported": ادعا با داده‌ها سازگار و شاهدش معتبر است
اطمینان نهایی را هم واقع‌بینانه اصلاح کن (ادعاهای wrong یعنی تحلیل غیرقابل‌اعتماد است).
فقط JSON برگردان:
{"verdicts":[{"section":"positives|negatives","index":عدد,"verdict":"supported|weak|wrong"}],"adjustedConfidence":عدد,"note":"یک جمله درباره کیفیت کلی تحلیل"}`;

const AI_TTL = 30 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const [quote, candles] = await Promise.all([
      getQuote(params.insCode),
      getDailyChart(params.insCode, 420),
    ]);
    const summary: TechSummary = computeSummary(candles, candles);
    const candlePatterns = detectPatterns(candles);
    const chartPatterns = detectChartPatterns(candles);
    const divergences = detectDivergence(candles);
    const weekly = computeSummary(toWeekly(candles), toWeekly(candles));

    let ai: AiResult | null = null;
    let aiError: string | null = null;

    if (!aiConfigured()) {
      aiError = "NO_KEY";
    } else {
      const cached = getLatest(technicalStore, params.insCode, AI_TTL);
      if (cached) {
        ai = cached;
      } else {
        try {
          ai = await requestAi(quote.symbol || params.insCode, quote, candles, summary, weekly, [
            ...candlePatterns,
            ...chartPatterns,
            ...divergences,
          ]);
          /* لایه بازبین: هر ادعا با داده تطبیق داده می‌شود */
          ai = await verify(ai, quote, summary, [...candlePatterns, ...chartPatterns, ...divergences]);
          /* گارد قطعی: حد ضرر باید در جهت درست ناحیه ورود باشد */
          if (ai.plan.entry && ai.plan.stopLoss !== null && ai.plan.stopLoss > ai.plan.entry.max) ai.plan.stopLoss = null;
          technicalStore.set(params.insCode, { t: Date.now(), data: ai });
        } catch (err) {
          aiError = err instanceof Error ? err.message : String(err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: { indicators: summary, patterns: [...candlePatterns, ...chartPatterns, ...divergences], ai, aiError },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}

async function verify(
  ai: AiResult,
  quote: { last: number },
  s: TechSummary,
  patterns: string[],
): Promise<AiResult> {
  try {
    const dataDigest = JSON.stringify({
      lastPrice: quote.last,
      rsi: s.rsi14?.toFixed(0),
      stoch: s.stoch,
      mfi: s.mfi14,
      macdHist: s.macdHist?.toFixed(0),
      ma20: s.ma20?.toFixed(0),
      ma50: s.ma50?.toFixed(0),
      atr: s.atr14,
      fib: s.fib,
      supports: s.supports,
      resistances: s.resistances,
      volRatio: s.volRatio?.toFixed(2),
      detectedPatterns: patterns,
    });
    const claims = {
      layers: ai.layers,
      summary: ai.summary,
      positives: ai.positives.map((p) => p.text),
      negatives: ai.negatives.map((p) => p.text),
      plan: ai.plan,
    };
    const res = await chatJSON<{
      verdicts: { section: string; index: number; verdict: string }[];
      adjustedConfidence: number;
    }>({
      system: VERIFY_SYSTEM,
      user: JSON.stringify({ dataDigest, claims }),
      model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
      temperature: 0,
      maxTokens: 1500,
    });

    const isBad = (section: string, index: number) =>
      res.verdicts?.some((v) => v.section === section && v.index === index && v.verdict === "wrong");

    const positives = ai.positives.filter((_, i) => !isBad("positives", i));
    const negatives = ai.negatives.filter((_, i) => !isBad("negatives", i));
    const removed = ai.positives.length - positives.length + (ai.negatives.length - negatives.length);

    let adjusted = res.adjustedConfidence ?? ai.confidence;
    if (adjusted <= 1) adjusted *= 100;
    adjusted = Math.max(0, Math.min(100, Math.round(adjusted)));

    return {
      ...ai,
      positives,
      negatives,
      confidence: Math.min(ai.confidence, adjusted),
      verified: { checked: ai.positives.length + ai.negatives.length, removed },
    };
  } catch {
    return { ...ai, verified: { checked: 0, removed: 0 } };
  }
}

function requestAi(
  symbol: string,
  quote: { last: number; yesterday: number; lastPct: number },
  candles: Candle[],
  s: TechSummary,
  weekly: TechSummary,
  confirmedPatterns: string[],
): Promise<AiResult> {
  const tail = candles.slice(-90).map((c) => ({
    d: c.date,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
    v: c.volume,
  }));
  const payload = {
    symbol,
    lastPrice: quote.last,
    yesterday: quote.yesterday,
    todayChangePct: Math.round(quote.lastPct * 100) / 100,
    daily: {
      rsi14: s.rsi14 !== null ? Math.round(s.rsi14 * 10) / 10 : null,
      ma20: s.ma20 !== null ? Math.round(s.ma20) : null,
      ma50: s.ma50 !== null ? Math.round(s.ma50) : null,
      maState: s.maState,
      macdHist: s.macdHist !== null ? Math.round(s.macdHist) : null,
      stoch: s.stoch,
      mfi14: s.mfi14,
      atr14: s.atr14,
      atrPct: s.atrPct,
      bollinger: s.bb ? { upper: Math.round(s.bb.upper), mid: Math.round(s.bb.mid), lower: Math.round(s.bb.lower) } : null,
      fib: s.fib,
      volumeVsAvg20: s.volRatio !== null ? Math.round(s.volRatio * 100) / 100 : null,
      monthChangePct: s.monthPct !== null ? Math.round(s.monthPct) : null,
      quarterChangePct: s.quarterPct !== null ? Math.round(s.quarterPct) : null,
      distanceFromYearHighPct: s.fromYearHighPct !== null ? Math.round(s.fromYearHighPct) : null,
      distanceFromYearLowPct: s.fromYearLowPct !== null ? Math.round(s.fromYearLowPct) : null,
    },
    weekly: {
      maState: weekly.maState,
      rsi14: weekly.rsi14 !== null ? Math.round(weekly.rsi14) : null,
      monthChangePct: weekly.monthPct !== null ? Math.round(weekly.monthPct) : null,
      quarterChangePct: weekly.quarterPct !== null ? Math.round(weekly.quarterPct) : null,
      supports: weekly.supports,
      resistances: weekly.resistances,
    },
    confirmedPatterns,
    levels: { supports: s.supports, resistances: s.resistances },
    recentDailyCandles: tail,
  };

  return chatJSON<AiResult>({
    system: SYSTEM,
    user: JSON.stringify(payload),
    temperature: 0.2,
    maxTokens: 2500,
  });
}
