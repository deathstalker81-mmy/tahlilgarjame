import { NextResponse, type NextRequest } from "next/server";
import { getQuotesByCodes, getDailyChart, getMarketWatchRows, getMarketOverview, getSectorPerformance } from "@/lib/tsetmc";
import { chatJSON, aiConfigured } from "@/lib/ai";
import { computeSummary } from "@/lib/indicators";
import { extractFinancials } from "@/lib/codal";
import { faPrice, faPct } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM = `تو «تحلیلگر جامع» هستی؛ دستیار هوشمند بازار سرمایه ایران در وب‌اپ تحلیلگر جامع.

قواعد طلایی پاسخ‌دهی:
۱. همه داده‌های زنده‌ای که داری در بخش «داده‌های زنده» آمده — این تنها منبع اعداد توست. هیچ عددی از حافظه‌ات نگو.
۲. اگر چیزی که کاربر می‌پرسد در داده‌های زنده نیست (مثلا صورت مالی یک نماد خاص، قیمت لحظه‌ای طلا، یا چیزی خارج از این داده‌ها)، صریح بگو: «این داده در دسترس لحظه‌ای من نیست» — هرگز حدس نزن.
۳. سوال مبهم؟ یک سوال شفاف‌کننده بپرس.
۴. فارسی روان و صمیمی؛ برای تحلیل نماد: قیمت، روند، P/E و نکته کلیدی؛ برای مفاهیم: آموزش ساده.
۵. توصیه قطعی ممنوع — احتمال‌محور + ریسک‌ها + دیسکلیمر کوتاه آخر تحلیل‌ها («تحلیل ماشینی است، سیگنال قطعی نیست»).
۶. تاریخ امروز را از داده‌های زنده بگیر (تاریخ شمسی).`;

function normalizeFa(s: string): string {
  return s
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function detectSymbols(text: string): Promise<string[]> {
  const rows = await getMarketWatchRows();
  const normText = ` ${normalizeFa(text)} `;
  const found = new Set<string>();
  for (const r of rows) {
    if (r.flow !== 1 && r.flow !== 2) continue;
    const sym = normalizeFa(r.lva ?? "");
    const name = normalizeFa(r.lvc ?? "");
    if (sym.length >= 3 && normText.includes(` ${sym} `)) found.add(r.insCode);
    else if (sym.length >= 4 && normText.includes(sym)) found.add(r.insCode);
    else if (name.length >= 6 && normText.includes(name)) found.add(r.insCode);
    if (found.size >= 5) break;
  }
  return [...found].slice(0, 3);
}

export async function POST(req: NextRequest) {
  try {
    if (!aiConfigured()) {
      return NextResponse.json({ ok: false, error: "NO_KEY" }, { status: 400 });
    }
    const body = await req.json();
    const messages: ChatMsg[] = (body?.messages ?? []).slice(-8);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return NextResponse.json({ ok: false, error: "بدون سوال" }, { status: 400 });

    /* === زمینه زنده: همیشه بازار + نمادهای تشخیص‌شده === */
    const codes = await detectSymbols(lastUser.content);

    const [overview, sectors, watchRows] = await Promise.all([
      getMarketOverview().catch(() => null),
      getSectorPerformance().catch(() => []),
      getMarketWatchRows().catch(() => []),
    ]);

    const nowFa = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "full" }).format(new Date());
    const nowTime = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date());

    let marketCtx = "";
    if (overview) {
      const indexPct = overview.indexLastValue - overview.indexChange !== 0
        ? Math.round((overview.indexChange / (overview.indexLastValue - overview.indexChange)) * 10000) / 100
        : 0;
      marketCtx = `امروز: ${nowFa} — ساعت تهران: ${nowTime}
شاخص کل: ${faPrice(overview.indexLastValue)} واحد (${faPct(indexPct)}) — ${overview.marketStateTitle}
ارزش معاملات بازار: ${faPrice(overview.marketActivityQTotCap / 10)} تومان — ${faPrice(overview.marketActivityZTotTran)} معامله
صنعت‌های برتر امروز: ${sectors.slice(0, 3).map((s) => `${s.name} (${faPct(s.pct)})`).join("، ") || "—"}
صنعت‌های ضعیف: ${sectors.slice(-3).reverse().map((s) => `${s.name} (${faPct(s.pct)})`).join("، ") || "—"}`;
    }

    const symbolCtx: string[] = [];
    for (const code of codes) {
      try {
        const rows = await getQuotesByCodes([code]);
        const r = rows[0];
        if (!r) continue;
        const candles = await getDailyChart(code, 260).catch(() => []);
        const s = candles.length > 30 ? computeSummary(candles, candles) : null;
        /* صورت‌های مالی سالانه برای فاندامنتال واقعی */
        let fundLine = "";
        try {
          const annual = (await import("@/lib/codal")).fetchCodalLetters(r.symbol || "", 60)
            .then((ls) => ls.find((l) => /صورت.?های مالی/.test(l.title) && !/توضیحات/.test(l.title)));
          const letter = await annual.catch(() => null);
          if (letter) {
            const snap = await extractFinancials(letter).catch(() => null);
            if (snap) {
              fundLine = `، سود خالص سالانه: ${faPrice(snap.netProfit)} میلیون ریال، ROE: ${faPrice(snap.roe)}٪، بدهی/حقوق: ${faPrice(snap.debtToEquity)}, حاشیه ناخالص: ${faPrice(snap.grossMargin)}٪`;
            }
          }
        } catch { /* بدون فاندامنتال */ }
        symbolCtx.push(
          `نماد ${r.symbol} (${r.name}): آخرین قیمت ${faPrice(r.last)} (${faPct(r.lastPct)})، پایانی ${faPrice(r.closing)}، دیروز ${faPrice(r.yesterday)}، EPS: ${r.eps ? faPrice(r.eps) : "نامشخص"}، P/E: ${r.pe ?? "نامشخص"}${s ? `، RSI: ${s.rsi14?.toFixed(0) ?? "-"}، روند میانگین‌ها: ${s.maState === "bull" ? "صعودی" : s.maState === "bear" ? "نزولی" : "خنثی"}، تغییر یک‌ماهه: ${s.monthPct?.toFixed(0) ?? "-"}٪` : ""}${fundLine}`,
        );
      } catch { /* skip */ }
    }

    /* برترین‌های روز (برای سوالات «چه خبر») */
    const moversRows = watchRows
      .filter((r) => (r.flow === 1 || r.flow === 2) && r.py > 0 && (r.pdv > 0 || r.pcl > 0))
      .map((r) => ({ sym: r.lva, pct: r.py > 0 ? ((r.pdv > 0 ? r.pdv : r.pcl) - r.py) / r.py * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct);
    const topUp = moversRows.slice(0, 3).map((m) => `${m.sym} (${faPct(m.pct)})`).join("، ");
    const topDown = moversRows.slice(-3).reverse().map((m) => `${m.sym} (${faPct(m.pct)})`).join("، ");

    const liveContext = `
${marketCtx}
برترین صعودی‌های امروز: ${topUp || "—"}
برترین ریزش‌های امروز: ${topDown || "—"}
${symbolCtx.length > 0 ? `\nنمادهای مورد سوال کاربر:\n${symbolCtx.join("\n")}` : ""}
`.trim();

    const raw = await chatJSON<Record<string, unknown>>({
      system: `${SYSTEM}\n\n=== داده‌های زنده (تنها منبع اعداد تو):\n${liveContext}`,
      user:
        messages.map((m) => `${m.role === "user" ? "کاربر" : "دستیار"}: ${m.content}`).join("\n") +
        '\n\nحالا پاسخ جدیدت را فقط به این شکل برگردان: {"reply": "متن پاسخ"}',
      temperature: 0.4,
      maxTokens: 1200,
    });

    let reply: unknown = typeof raw === "string" ? raw : raw?.reply;
    if (typeof reply !== "string" || reply.length < 2) {
      const alt = typeof raw === "object" && raw !== null ? Object.values(raw).find((v) => typeof v === "string" && v.length > 10) : null;
      reply = alt ?? null;
    }
    if (typeof reply !== "string") throw new Error("پاسخ نامعتبر از مدل");

    return NextResponse.json({ ok: true, data: { reply, symbolsDetected: codes } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
