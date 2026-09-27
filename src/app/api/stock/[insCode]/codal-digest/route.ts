import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/tsetmc";
import { fetchCodalLetters } from "@/lib/codal";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DigestStory {
  story: string;
  busyLevel: string;
}

const SYSTEM = `تو گزارشگر بورسی صمیمی هستی. اطلاعیه‌های رسمی اخیر یک شرکت از کدال به تو داده می‌شود.
یک روایت خودمونی و روان (۳-۴ جمله) تعریف کن که «چه خبرا بوده» — انگار برای یک سهام‌دار تعریف می‌کنی:
- شرکت اخیراً چی منتشر کرده؟ مهم‌ترینش کدومه؟ نشون‌دهنده چیه؟
- فقط بر اساس اطلاعیه‌های داده‌شده — هیچی از خودت اضافه نکن
- اگر اطلاعیه‌ها همه روتینه، رک بگو «خبر خاصی نبود»
- لحن: حرفه‌ای ولی صمیمی، بدون اغراق
فقط JSON برگردان: {"story":"...","busyLevel":"داغ|عادی|ساکت"}`;

const cache = new Map<string, { t: number; data: DigestStory }>();
const TTL = 60 * 1000; // هر کلیک تقریباً تازه — فقط ضد اسپم

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
    const letters = await fetchCodalLetters(quote.symbol || "", 20);
    if (letters.length === 0) {
      return NextResponse.json({ ok: true, data: { story: "اطلاعیه‌ای از کدال در دسترس نیست — شرکت ساکت نشسته.", busyLevel: "ساکت" } });
    }

    const list = letters.map((l, i) => `${i + 1}. [${l.category}] ${l.title}`).join("\n");
    const res = await chatJSON<DigestStory>({
      system: SYSTEM,
      user: list,
      model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
      temperature: 0.5,
      maxTokens: 800,
    });

    cache.set(params.insCode, { t: Date.now(), data: res });
    return NextResponse.json({ ok: true, data: res });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
