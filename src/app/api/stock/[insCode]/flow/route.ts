import { NextResponse, type NextRequest } from "next/server";
import { getClientTypeToday, getClientTypeHistory, getQuote } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** پول حقیقی/حقوقی — امروز + روند ۳۰ روزه */
export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const quote = await getQuote(params.insCode);
    const [todayRaw, historyRaw] = await Promise.all([
      getClientTypeToday(params.insCode, quote.date).catch(() => null),
      getClientTypeHistory(params.insCode).catch(() => []),
    ]);

    /* اگر داده امروز هنوز ثبت نشده (بعد از بسته‌شدن بازار)، آخرین جلسه معاملاتی = مرجع */
    let today = todayRaw;
    const history = [...historyRaw];
    if (!today && history.length > 0) {
      today = history[history.length - 1];
    }
    if (today) {
      const idx = history.findIndex((h) => h.date === today.date);
      if (idx >= 0) history.splice(idx, 1);
    }

    return NextResponse.json({
      ok: true,
      data: {
        today,
        history: history.filter((h) => h.date !== quote.date),
        todayDate: today?.date ?? quote.date,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
