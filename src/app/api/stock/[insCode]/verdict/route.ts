import { NextResponse, type NextRequest } from "next/server";
import { chatJSON, aiConfigured } from "@/lib/ai";
import { technicalStore, fundamentalStore, getLatest, type TechnicalAiResult, type FundamentalAiData } from "@/lib/analysis-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TECH_TTL = 30 * 60 * 1000;
const FUND_TTL = 6 * 60 * 60 * 1000;

interface Verdict {
  verdict: string;
  story: string;
  strategy: string;
  confidence: number;
}

const SYSTEM = `تو ارشدترین تحلیلگر تیم هستی. دو تحلیل جدا (تکنیکال + فاندامنتال) یک نماد به تو داده می‌شود و باید جمع‌بندی نهاییِ عملی بنویسی.

ماتریس تصمیم:
- فاندامنتال خوب + تکنیکال می‌گوید الان نقطه ورود نیست → «سهم خوبه ولی صبر کن قیمت برگرده»
- فاندامنتال خوب + تکنیکال نقطه ورود → «بخر»
- فاندامنتال بد + تکنیکال سیگنال خرید کوتاه‌مدت → هشدار: «این حرکت شایعه‌محور/کوتاه‌مدته، مواظب باش»
- فاندامنتال بد + تکنیکال بد → «دور باش»
- حالت‌های مرزی → «هولد/نظاره‌گر»

قواعد: فقط از داده‌های دو تحلیل استدلال کن، تناقض‌ها را صریح بگو (مثلا فاندامنتال ضعیف + تکنیکال قوی = ریسک شایعه‌محور)، و در strategy یک توصیه عملی کوتاه بده (مثلا: «نصف حجم، در محدوده ورود»).
فقط JSON: {"verdict":"جمع‌بندی در حداکثر ۸ کلمه","story":"۳-۴ جمله استدلال","strategy":"توصیه عملی کوتاه","confidence":۰-۱۰۰}`;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const tech = getLatest<TechnicalAiResult>(technicalStore, params.insCode, TECH_TTL);
    const fund = getLatest<FundamentalAiData>(fundamentalStore, params.insCode, FUND_TTL);

    if (!tech || !fund?.analysis) {
      return NextResponse.json({
        ok: true,
        data: {
          ready: false,
          missing: [!tech && "تکنیکال", !fund?.analysis && "فاندامنتال"].filter(Boolean),
        },
      });
    }

    if (!aiConfigured()) {
      return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });
    }

    const res = await chatJSON<Verdict>({
      system: SYSTEM,
      user: JSON.stringify({
        fundamental: {
          score: fund.analysis.score,
          conclusion: fund.analysis.conclusion,
          confidence: fund.analysis.confidence,
          positives: fund.analysis.positives.map((p) => p.text),
          negatives: fund.analysis.negatives.map((p) => p.text),
          risks: fund.analysis.risks,
        },
        technical: {
          trend: tech.trend,
          conclusion: tech.conclusion,
          confidence: tech.confidence,
          layers: tech.layers,
          plan: tech.plan,
        },
      }),
      model: process.env.AI_MODEL_DEEP || "gpt-4.1-mini",
      temperature: 0.2,
      maxTokens: 900,
    });

    return NextResponse.json({
      ok: true,
      data: {
        ready: true,
        verdict: {
          verdict: res.verdict,
          story: res.story,
          strategy: res.strategy,
          confidence: res.confidence <= 1 ? Math.round(res.confidence * 100) : Math.round(res.confidence),
        },
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
