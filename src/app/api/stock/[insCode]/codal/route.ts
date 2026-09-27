import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/tsetmc";
import { fetchCodalLetters, type CodalLetter } from "@/lib/codal";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Extraction {
  items: { title: string; why: string; impact: "مثبت" | "منفی" | "خنثی" }[];
  updatedAt: number;
}

interface CodalData {
  letters: CodalLetter[];
  extraction: Extraction | null;
  aiError: string | null;
}

const SYSTEM = `تو تحلیلگر ارشد رسمی اطلاعیه‌های کدال هستی. فهرست اطلاعیه‌های رسمی یک شرکت بورسی به تو داده می‌شود.
مهم‌ترین اطلاعیه‌ها برای تصمیم سرمایه‌گذار را انتخاب کن (حداکثر ۶ مورد) و برای هرکدام بگو «چرا مهم است» — یعنی اثرش چیست: بر سود، بر ارزش‌گذاری، بر نقدشوندگی، بر تصمیم‌های آینده شرکت.
فقط بر اساس متن اطلاعیه (تیتر) حرف بزن؛ فراتر از آن حدس نزن.
فقط JSON برگردان: {"items":[{"title":"...","why":"یک دو جمله","impact":"مثبت|منفی|خنثی"}]}`;

const exCache = new Map<string, { t: number; data: Extraction }>();
const EX_TTL = 6 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { insCode: string } }) {
  try {
    const quote = await getQuote(params.insCode);
    const letters = await fetchCodalLetters(quote.symbol || "");

    let extraction: Extraction | null = null;
    let aiError: string | null = null;

    if (letters.length > 0) {
      const cachedEx = exCache.get(params.insCode);
      if (cachedEx && Date.now() - cachedEx.t < EX_TTL) {
        extraction = cachedEx.data;
      } else if (aiConfigured()) {
        try {
          const important = letters.filter((l) => l.important).slice(0, 15);
          const list = important.length > 0 ? important : letters.slice(0, 15);
          const res = await chatJSON<{ items: Extraction["items"] }>({
            system: SYSTEM,
            user: list.map((l, i) => `${i + 1}. [${l.category}] ${l.title}`).join("\n"),
            model: process.env.AI_MODEL_FAST || "gemini-2.5-flash-lite",
            temperature: 0.2,
            maxTokens: 1500,
          });
          if (res.items?.length) {
            extraction = { items: res.items.slice(0, 6), updatedAt: Date.now() };
            exCache.set(params.insCode, { t: Date.now(), data: extraction });
          }
        } catch (err) {
          aiError = err instanceof Error ? err.message : String(err);
        }
      } else {
        aiError = "NO_KEY";
      }
    }

    return NextResponse.json({ ok: true, data: { letters, extraction, aiError } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
