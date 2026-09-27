import { NextResponse, type NextRequest } from "next/server";
import { getInstrumentIdentity, getMarketOverview } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** عملکرد امروز سهم در برابر شاخص کل و صنعت خودش */
export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const [overview, identity] = await Promise.all([
      getMarketOverview(),
      getInstrumentIdentity(params.insCode).catch(() => null),
    ]);

    const indexPct =
      overview.indexLastValue - overview.indexChange !== 0
        ? (overview.indexChange / (overview.indexLastValue - overview.indexChange)) * 100
        : 0;

    const sectorCode = identity?.sector?.cSecVal?.trim() || null;
    let sectorPct: number | null = null;
    if (sectorCode) {
      try {
        const idx = await fetch("https://cdn.tsetmc.com/api/Index/GetIndexB1LastAll/1/1", {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
          cache: "no-store",
        }).then((r) => r.json());
        const sectorIdx = (idx.indexB1 ?? []).find((i: { lVal30: string }) => i.lVal30?.startsWith(`${sectorCode}-`));
        if (sectorIdx && typeof sectorIdx.xVarIdxJRfV === "number") {
          sectorPct = Math.round(sectorIdx.xVarIdxJRfV * 100) / 100;
        }
      } catch {
        /* بدون صنعت */
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        indexPct: Math.round(indexPct * 100) / 100,
        sectorPct,
        sectorName: identity?.sector?.lSecVal?.trim() || null,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
