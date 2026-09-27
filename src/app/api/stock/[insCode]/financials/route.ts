import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/tsetmc";
import { fetchCodalLetters, extractFinancials } from "@/lib/codal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** در یک نگاه مالی — نسبیت‌های کلیدی، همه محاسبه قطعی از صورت‌های مالی رسمی */
export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const quote = await getQuote(params.insCode);
    const finLetters = (await fetchCodalLetters(quote.symbol || "", 60)).filter(
      (l) => /صورت.?های مالی/.test(l.title) && !/توضیحات/.test(l.title),
    );
    /* اولویت: تلفیقی شرکت اصلی → هر تلفیقی → هر صورت مالی */
    const annual =
      finLetters.find((l) => /تلفیقی/.test(l.title) && !/\(شرکت/.test(l.title))
      ?? finLetters.find((l) => !/\(شرکت/.test(l.title))
      ?? finLetters[0];
    console.log("[financials] picked:", annual?.title?.slice(0, 60) ?? "NO");

    if (!annual) {
      return NextResponse.json({ ok: true, data: { snapshot: null, note: "اطلاعیه صورت‌های مالی یافت نشد" } });
    }
    const snapshot = await extractFinancials(annual).catch(() => null);
    if (snapshot && !snapshot.yearLabel) {
      snapshot.yearLabel = annual.title.match(/منته[يی] به\s+([۰-۹\/]+)/)?.[1] ?? "";
    }
    return NextResponse.json({ ok: true, data: { snapshot, letter: annual.title } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
