import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getDailyChart } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { insCode: string } },
) {
  try {
    const [quote, chart] = await Promise.all([
      getQuote(params.insCode),
      getDailyChart(params.insCode).catch(() => []),
    ]);
    return NextResponse.json({ ok: true, data: { quote, chart } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
