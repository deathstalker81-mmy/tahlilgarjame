import { NextResponse, type NextRequest } from "next/server";
import { getPeers } from "@/lib/tsetmc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const data = await getPeers(params.insCode);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
