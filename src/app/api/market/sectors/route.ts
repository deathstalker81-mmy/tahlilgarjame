import { NextResponse } from "next/server";
import { getSectorPerformance } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** برترین و ضعیف‌ترین صنعت‌های امروز */
export async function GET() {
  try {
    const all = await getSectorPerformance();
    return NextResponse.json({
      ok: true,
      data: {
        best: all.slice(0, 5),
        worst: all.slice(-5).reverse(),
        updatedAt: Date.now(),
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
