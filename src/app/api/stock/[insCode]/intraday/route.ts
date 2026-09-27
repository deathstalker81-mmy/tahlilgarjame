import { NextResponse, type NextRequest } from "next/server";
import { getIntraday, getQuote } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** اگر داده امروز هنوز در دسترس نباشد، آخرین جلسه معاملاتی کامل را برمی‌گردانیم */
export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const quote = await getQuote(params.insCode);
    const today = quote.date;

    let points = await getIntraday(params.insCode, today);
    let date = today;
    let isToday = true;

    if (points.length < 5) {
      isToday = false;
      for (let back = 1; back <= 5; back++) {
        const d = new Date(Date.UTC(Math.floor(today / 10000), Math.floor(today / 100) % 100 - 1, today % 100));
        d.setUTCDate(d.getUTCDate() - back);
        const ymd = Number(
          `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`,
        );
        const candidate = await getIntraday(params.insCode, ymd).catch(() => []);
        if (candidate.length >= 5) {
          points = candidate;
          date = ymd;
          break;
        }
      }
    }

    return NextResponse.json({ ok: true, data: { date, isToday, points } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
