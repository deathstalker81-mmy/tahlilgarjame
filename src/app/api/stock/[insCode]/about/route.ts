import { NextResponse, type NextRequest } from "next/server";
import { getQuote, getDailyChart } from "@/lib/tsetmc";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PublisherRaw {
  codalPublisher: {
    symbol: string;
    name: string;
    executiveManager: string;
    address: string;
    telNo: string | null;
    activitySubject: string | null;
  } | null;
}

interface AboutData {
  symbol: string;
  name: string;
  type: string;
  sectorName: string | null;
  subSector: string | null;
  marketTitle: string | null;
  manager: string | null;
  city: string | null;
  phone: string | null;
  address: string | null;
  isin: string | null;
  listedSince: string | null;
  subjectRaw: string | null;
  shareholders: { name: string; pct: number }[];
  profile: { about: string; products: string[]; keyPoints: string[] } | null;
  aiError: string | null;
}

const SYSTEM = `تو یک تحلیلگر ارشد شرکت‌های بورسی ایران هستی.
مشخصات یک شرکت به تو داده می‌شود (شرح فعالیت رسمی، گروه صناعتی، سهامداران عمده).
معرفی روان و مفیدی برای سرمایه‌گذار بنویس:
- "about": ۴ تا ۶ جمله درباره شرکت — فعالیت اصلی، جایگاه و سهم بازار در صنعت، بازارهای هدف، عوامل اصلی درآمدی و هر نکته مهم کسب‌وکاری (زبان ساده، بدون کپی متن رسمی، بدون اغراق)
- "products": ۳ تا ۶ محصول یا خدمت اصلی (عبارت کوتاه)
- "keyPoints": ۳ تا ۵ نکته کلیدی که سرمایه‌گذار باید بداند — مزیت رقابتی، وابستگی‌ها (مثل نرخ ارز/انرژی)، ریسک‌های کسب‌وکار خاص این شرکت
فقط JSON برگردان: {"about":"...","products":["..."],"keyPoints":["..."]}`;

const cache = new Map<string, { t: number; data: AboutData }>();
const TTL = 7 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const cached = cache.get(params.insCode);
    if (cached && Date.now() - cached.t < TTL) {
      return NextResponse.json({ ok: true, data: cached.data });
    }

    const quote = await getQuote(params.insCode);
    const data: AboutData = {
      symbol: quote.symbol,
      name: quote.name,
      type: quote.type,
      sectorName: quote.sectorName,
      subSector: quote.subSector,
      marketTitle: quote.marketTitle,
      manager: null,
      city: null,
      phone: null,
      address: null,
      isin: quote.insId,
      listedSince: null,
      subjectRaw: null,
      shareholders: [],
      profile: null,
      aiError: null,
    };

    /* در بورس از کی؟ — اولین کندل تاریخی */
    try {
      const chart = await getDailyChart(params.insCode, 9999);
      if (chart.length > 0) {
        const first = chart[0].date;
        const iso = `${first.slice(0, 4)}-${first.slice(4, 6)}-${first.slice(6, 8)}T12:00:00Z`;
        data.listedSince = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date(iso));
      }
    } catch {
      /* ignore */
    }

    /* سهامداران عمده (داده واقعی TSETMC) */
    try {
      const shRes = await fetch(`https://cdn.tsetmc.com/api/Shareholder/GetInstrumentShareHolderLast/${params.insCode}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (shRes.ok) {
        const sh = (await shRes.json()) as { shareHolder: { shareHolderName: string; perOfShares: number }[] };
        data.shareholders = (sh.shareHolder ?? [])
          .filter((s) => s.perOfShares > 0)
          .slice(0, 5)
          .map((s) => ({ name: s.shareHolderName?.trim() ?? "", pct: Math.round(s.perOfShares * 10) / 10 }));
      }
    } catch {
      /* بدون سهامداران */
    }

    /* داده رسمی کدال */
    if (quote.symbol) {
      try {
        const res = await fetch(
          `https://cdn.tsetmc.com/api/Codal/GetCodalPublisherBySymbol/${encodeURIComponent(quote.symbol)}`,
          { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as PublisherRaw;
          const pub = json.codalPublisher;
          if (pub) {
            data.manager = pub.executiveManager?.trim() || null;
            const addr = pub.address?.trim() || "";
            data.address = addr || null;
            data.city = addr.split(/\s+/)[0]?.trim().slice(0, 20) || null;
            data.phone = pub.telNo?.trim() || null;
            data.subjectRaw = pub.activitySubject?.replace(/\r|\n/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200) || null;
          }
        }
      } catch {
        /* بدون کدال */
      }
    }

    /* پروفایل هوش مصنوعی */
    if (aiConfigured() && (data.subjectRaw || data.sectorName)) {
      try {
        const profile = await chatJSON<{ about: string; products: string[]; keyPoints: string[] }>({
          system: SYSTEM,
          user: JSON.stringify({
            company: data.name || data.symbol,
            symbol: data.symbol,
            sector: data.sectorName,
            subSector: data.subSector,
            officialActivity: data.subjectRaw?.slice(0, 1500),
            majorShareholders: data.shareholders.map((s) => `${s.name} (${s.pct}%)`),
          }),
          model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
          temperature: 0.4,
          maxTokens: 1500,
        });
        if (profile?.about) {
          data.profile = {
            about: profile.about,
            products: Array.isArray(profile.products) ? profile.products.slice(0, 6) : [],
            keyPoints: Array.isArray(profile.keyPoints) ? profile.keyPoints.slice(0, 5) : [],
          };
        }
      } catch (err) {
        data.aiError = err instanceof Error ? err.message : String(err);
      }
    } else if (!aiConfigured()) {
      data.aiError = "NO_KEY";
    }

    cache.set(params.insCode, { t: Date.now(), data });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
