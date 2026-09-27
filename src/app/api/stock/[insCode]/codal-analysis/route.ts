import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getQuote } from "@/lib/tsetmc";
import { fetchCodalLetters, fetchLetterTables } from "@/lib/codal";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeepAnalysis {
  pnl: { salesYoy: string; profitYoy: string; grossMargin: string; trend: string; comment: string } | null;
  monthlySales: { yoy: string; trend: string; comment: string } | null;
  cashFlow: { operating: string; prior: string; comment: string } | null;
  development: { plans: string[]; comment: string } | null;
  confidence: number;
}

const SYSTEM = `تو تحلیلگر ارشد صورت‌های مالی بورس تهران هستی. متن ردیف‌های جدول اطلاعیه‌های کدال (گزارش فعالیت ماهانه + صورت‌های مالی) به تو داده می‌شود.

راهنمای ساختار جدول‌ها (مهم!):
- جدول‌ها به صورت MARKDOWN هستند — سلول‌ها با | جدا شده‌اند و ستون‌ها ترازند. سربرگ‌ها (ردیف‌های اول) نام ستون‌ها را می‌گویند: شرح | تعداد تولید | تعداد فروش | نرخ فروش | مبلغ فروش... در گروه‌های ستونی: دوره یک‌ماهه جاری، اصلاحات، دوره مشابه سال قبل، تجمعی امسال، تجمعی سال قبل.
- برای YoY ماهانه: «مبلغ فروش» ستونِ دوره یک‌ماهه جاری ÷ همان ستون در دوره مشابه سال قبل − ۱. (واحد معمولاً میلیون ریال)
- صورت‌های مالی: ردیف‌های فروش خالص، بهای تمام‌شده، سود ناخالص، سود عملیاتی، سود خالص، سود هر سهم، جریان خالص وجه نقد عملیاتی — دو ستون دوره جاری و مشابه سال قبل — رشد = جاری ÷ قبلی − ۱.
- حاشیه سود ناخالص = (فروش − بهای تمام‌شده) ÷ فروش.

قواعد سخت‌گیرانه:
۱. اعداد در جدول‌ها هست — با دقت ستون‌ها را بشمار و محاسبه کن. null فقط وقتی که واقعاً ردیف مرتبطی در جدول نیست.
۲. فقط اعدادی که در ردیف‌های داده‌شده هست را استفاده کن — هیچ عددی از خودت نساز.
۳. جریان نقد عملیاتی مهم‌تر از سود خالص است — اگر سود بالا ولی نقد عملیاتی ضعیف است، صریح بگو.
۴. برای طرح‌های توسعه‌ای فقط از اطلاعیه‌های بااهمیت/مجمع/افزایش سرمایه که در تیترها هستند نام ببر.

خروجی فقط JSON:
{
 "pnl": {"salesYoy":"مثلا: +۱۲٪ رشد یا null","profitYoy":"...","grossMargin":"مثلا: ۲۳٪ یا null","trend":"صعودی|نزولی|ثابت|null","comment":"۱-۲ جمله با اشاره به عددها"},
 "monthlySales": {"yoy":"٪ تغییر مبلغ فروش ماهانه سال‌به‌سال یا null","trend":"...","comment":"..."},
 "cashFlow": {"operating":"عدد جاری یا null","prior":"عدد قبلی یا null","comment":"مقایسه با سود خالص"},
 "development": {"plans":["از تیترها"],"comment":"..."},
 "confidence": ۰-۱۰۰
}`;

const cache = new Map<string, { t: number; data: { analysis: DeepAnalysis | null; aiError: string | null; sources: { title: string; kind: string }[] } }>();
const TTL = 6 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const cached = cache.get(params.insCode);
    if (cached && Date.now() - cached.t < TTL) {
      return NextResponse.json({ ok: true, data: cached.data });
    }
    if (!aiConfigured()) {
      return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });
    }

    const quote = await getQuote(params.insCode);
    const letters = await fetchCodalLetters(quote.symbol || "", 40);

    /* اطلاعیه شرکت اصلی/تلفیقی مقدم است بر شرکت‌های تابعه */
    const isMainLetter = (t: string) => !/\((?:شرکت|گروه)\s/.test(t) && !/ورزشی|فرهنگی/.test(t);
    const pick = (pattern: RegExp) =>
      letters.find((l) => pattern.test(l.title) && isMainLetter(l.title)) ??
      letters.find((l) => pattern.test(l.title));

    /* انتخاب اسناد: ماهانه + تلفیقی (که گزارش هیئت مدیره و صورت‌ها توشه) */
    const monthly = pick(/گزارش فعالیت ماهانه/);
    const annual = letters.find((l) => /صورت.?های مالی/.test(l.title) && !/توضیحات/.test(l.title) && isMainLetter(l.title)) 
      ?? letters.find((l) => /صورت.?های مالی/.test(l.title) && !/توضیحات/.test(l.title));

    const sources: { title: string; kind: string }[] = [];
    let docs = "";
    const toMdTable = (rows: string[][]) => rows.map((r) => `| ${r.join(" | ")} |`).join("\n");

    /* ۱) جدول فروش ماهانه با سربرگ دوطبقه */
    if (monthly) {
      try {
        const tables = await fetchLetterTables(monthly);
        const main = tables.find((t) => t.some((r) => /مبلغ فروش|نرخ فروش/.test(r.join(" "))));
        if (main && main.length > 3) {
          const h0 = main[0];
          const h1 = main[1] ?? [];
          const combined = Array.from({ length: Math.max(h0.length, h1.length) }, (_, i) =>
            `${h0[i] ?? ""} ${h1[i] ?? ""}`.replace(/\s+/g, " ").trim(),
          );
          docs += `\n### جدول فروش ماهانه (${monthly.title}):\nستون‌ها: ${combined.filter(Boolean).join(" / ")}\n${toMdTable(main.slice(2))}\n`;
          sources.push({ title: monthly.title, kind: "monthly" });
        }
      } catch (err) {
        console.error("[codal-analysis] monthly failed:", err instanceof Error ? err.message : err);
      }
    }

    /* ۲) اطلاعیه سالانه: جداول سود و زیان چندساله، فروش، طرح‌ها، ظرفیت */
    if (annual) {
      try {
        const tables = await fetchLetterTables(annual);
        let used = 0;
        for (const t of tables) {
          if (used >= 5) break;
          if (t.length < 3) continue;
          const text = t.map((r) => r.join(" ")).join(" ");
          let kind = null;
          if (/نام شرکت/.test(text) && /برآورد/.test(text) && t.length > 10) kind = "سود و زیان شرکت‌های گروه (۳ سال + برآورد)";
          else if (/شرح/.test(text) && /برآورد/.test(text) && /میلیون ریال|فروش/.test(text) && t.length > 5) kind = "فروش و درآمد دوره‌ها (سال قبل، جاری، برآورد)";
          else if (/نام طرح/.test(text)) kind = "طرح‌های توسعه‌ای با هزینه‌ها";
          else if (/نوع کالا/.test(text) && /ظرفیت عملی/.test(text)) kind = "ظرفیت تولید و قیمت‌گذاری";
          if (kind) {
            docs += `\n### ${kind}:\n${toMdTable(t.slice(0, 35)).slice(0, 9000)}\n`;
            used++;
          }
        }
        if (used > 0) sources.push({ title: annual.title, kind: "annual" });
      } catch (err) {
        console.error("[codal-analysis] annual failed:", err instanceof Error ? err.message : err);
      }
    }

    /* اطلاعیه‌های بااهمیت/مجمع/سرمایه برای طرح‌های توسعه‌ای */
    const devLetters = letters.filter((l) => /بااهمیت|افزایش سرمایه|مجمع|طرح|سرمایه.?گذاری/.test(l.title)).slice(0, 8);
    if (devLetters.length > 0) {
      docs += `\n### سایر اطلاعیه‌های مهم (تیترها):\n${devLetters.map((l) => "- " + l.title).join("\n")}`;
    }

    if (!docs) {
      return NextResponse.json({ ok: true, data: { analysis: null, aiError: "اطلاعیه‌ای برای تحلیل عمیق یافت نشد", sources: [] } });
    }
    console.log("[codal-analysis] docs length:", docs.length);

    const analysis = await chatJSON<DeepAnalysis>({
      system: SYSTEM,
      user: docs.slice(0, 150000),
      model: process.env.AI_MODEL_DEEP || "gpt-4.1-mini",
      temperature: 0.1,
      maxTokens: 1800,
    });
    console.log("[codal-analysis] raw AI:", JSON.stringify(analysis).slice(0, 600));
    /* نرمال‌سازی اطمینان ۰-۱ → ۰-۱۰۰ */
    if (analysis.confidence <= 1) analysis.confidence = Math.round(analysis.confidence * 100);
    analysis.confidence = Math.max(0, Math.min(100, Math.round(analysis.confidence)));

    const data = { analysis, aiError: null, sources };
    cache.set(params.insCode, { t: Date.now(), data });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json({ ok: true, data: { analysis: null, aiError: msg.slice(0, 120), sources: [] } });
  }
}
