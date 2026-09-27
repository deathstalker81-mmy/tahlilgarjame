import { NextResponse } from "next/server";
import { fetchMarketNews } from "@/lib/news";
import { fetchMarketCodalLetters } from "@/lib/codal";
import { chatJSON, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Screened {
  i: number;
  category: string;
  importance: number;
  credibility: "تأیید شده" | "محتمل" | "شایعه";
  summary: string;
}

const SYSTEM = `تو سردبیر ارشد خبرگزاری بورس تهران هستی و «واحد غربال اخبار و شایعات» را اجرا می‌کنی.

ورودی: ۱) اطلاعیه‌های رسمی کدال (گروه الف = اسناد بااهمیت بازار، گروه ب = روتین) ۲) اخبار رسانه‌ها (شماره‌گذاری‌شده).

کارها:
۱. گروه الف و ب کدال را جدا گزارش بده (خودشان داده شده‌اند — فقط برجسته کن)
۲. از اخبار رسانه‌ها فقط مهم‌ترین‌ها (حداکثر ۱۰) را نگه دار؛ تکراری و بی‌اهمیت حذف
۳. به هر خبر رسانه‌ای «سطح اعتبار» بده:
   - "تأیید شده": خبری که با یکی از اطلاعیه‌های کدال (الف یا ب) هم‌راستاست — در summary به شماره اطلاعیه استناد کن
   - "شایعه": خبر با ادبیات نامطمئن (به گفته منابع آگاه، شایعه شده، احتمالاً، قرار است) بدون پشتوانه رسمی
   - "محتمل": خبر رسانه معتبر بدون تایید رسمی و بدون ادبیات شایعه
۴. از خودت خبر نساز؛ summary فقط یک جمله از محتوای خود خبر.

فقط JSON برگردان:
{"screened":[{"i":شماره خبر رسانه‌ای,"category":"...","importance":۰-۱۰۰,"credibility":"تأیید شده|محتمل|شایعه","summary":"..."}]}`;

let cachedAt = 0;
let cachedData: unknown = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  try {
    if (cachedData && Date.now() - cachedAt < TTL) {
      return NextResponse.json({ ok: true, data: cachedData });
    }
    const [news, codalAll] = await Promise.all([
      fetchMarketNews(),
      fetchMarketCodalLetters(30).catch(() => []),
    ]);

    const groupA = codalAll.filter((l) => l.group === "الف" || (l.important && l.group === null)).slice(0, 10);
    const groupB = codalAll.filter((l) => l.group === "ب").slice(0, 10);

    if (!aiConfigured()) {
      const data = { groupA, groupB, screened: null, aiError: "NO_KEY", updatedAt: Date.now() };
      cachedData = data;
      cachedAt = Date.now();
      return NextResponse.json({ ok: true, data });
    }

    const codalDigest = [
      ...groupA.map((l, i) => `کالف-${i}. [${l.symbol}] ${l.title}`),
      ...groupB.map((l, i) => `کب-${i}. [${l.symbol}] ${l.title}`),
    ].join("\n");
    const mediaList = news.slice(0, 40).map((n, i) => `${i}. [${n.source}] ${n.title}`).join("\n");

    const res = await chatJSON<{ screened: Screened[] }>({
      system: SYSTEM,
      user: `=== اطلاعیه‌های کدال گروه الف:\n${groupA.map((l, i) => `کالف-${i}. [${l.symbol}] ${l.title}`).join("\n") || "—"}\n\n=== اطلاعیه‌های کدال گروه ب:\n${groupB.map((l, i) => `کب-${i}. [${l.symbol}] ${l.title}`).join("\n") || "—"}\n\n=== اخبار رسانه‌ها:\n${mediaList}`,
      model: process.env.AI_MODEL_DEEP || "gpt-4.1-mini",
      temperature: 0.2,
      maxTokens: 2200,
    });

    const screened = (res.screened ?? [])
      .filter((s) => typeof s.i === "number" && news[s.i])
      .slice(0, 12)
      .map((s) => ({
        ...s,
        title: news[s.i].title,
        link: news[s.i].link,
        source: news[s.i].source,
        pubDate: news[s.i].pubDate,
        importance: Math.max(0, Math.min(100, Math.round(s.importance))),
      }));

    const data = { groupA, groupB, screened, aiError: null, updatedAt: Date.now() };
    cachedData = data;
    cachedAt = Date.now();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
