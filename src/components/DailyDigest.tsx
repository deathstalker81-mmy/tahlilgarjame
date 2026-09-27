"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, MoonStar, Sparkles } from "lucide-react";
import { faDate, faInt, faPct } from "@/lib/format";

interface Digest {
  mood: "مثبت" | "منفی" | "خنثی";
  headline: string;
  summary: string;
  highlights: { text: string; tag: string; ref: number | null; link?: string }[];
}

interface Facts {
  indexPct: number;
  eqwPct: number;
  tradeValueToman: number;
  tradeCount: number;
}

const TAG_ICON: Record<string, string> = {
  بورس: "📈",
  صنعت: "🏭",
  "ارز و طلا": "💰",
  کالا: "🛢",
  جهانی: "🌍",
  شرکت: "🏢",
};

export function DailyDigest() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [facts, setFacts] = useState<Facts | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isClosedDay, setIsClosedDay] = useState(false);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/market/digest");
        const json = await res.json();
        if (alive && json.ok) {
          setDigest(json.data.digest);
          setFacts(json.data.facts);
          setAiError(json.data.aiError);
          setIsClosedDay(Boolean(json.data.isClosedDay));
          setDataDate(json.data.dataDate ?? null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <section className="card overflow-hidden">
        <div className="bg-gradient-to-l from-brand-soft/70 to-transparent p-5">
          <div className="skeleton h-5 w-44" />
          <div className="skeleton mt-3 h-7 w-3/4" />
          <div className="skeleton mt-2 h-3 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      </section>
    );

  if (!digest)
    return (
      <section className="card p-5 text-center text-xs text-muted">
        {aiError === "NO_KEY" ? "برای گزارش روزانه، کلید AvalAI لازم است" : "گزارش روزانه هنوز آماده نیست"}
      </section>
    );

  const moodStyle =
    digest.mood === "مثبت"
      ? "bg-up/15 text-up border-up/30"
      : digest.mood === "منفی"
        ? "bg-down/15 text-down border-down/30"
        : "bg-gold/15 text-gold border-gold/30";
  const moodEmoji = digest.mood === "مثبت" ? "🟢" : digest.mood === "منفی" ? "🔴" : "⚪";

  return (
    <section className="card animate-fade-up overflow-hidden">
      {/* هدر گرادیانی */}
      <div className="bg-gradient-to-l from-brand/15 via-brand-soft/40 to-transparent p-5 pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 shadow-card">
            <MoonStar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black">{isClosedDay ? "در آخرین روز معاملاتی" : "امروز در بورس"}</h2>
            <div className="num text-[10px] text-muted">{isClosedDay ? dataDate ?? "" : faDate(Date.now())}{isClosedDay ? " (امروز بازار تعطیل است)" : ""}</div>
          </div>
          <span className={`ms-auto rounded-xl border px-3 py-1.5 text-xs font-black ${moodStyle}`}>
            {moodEmoji} حال‌وهوا: {digest.mood}
          </span>
        </div>

        {/* نوار آمار سریع */}
        {facts && (
          <div className="num mt-4 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-lg bg-surface-2/80 px-2.5 py-1 font-bold text-ink">
              شاخص کل: <span className={facts.indexPct >= 0 ? "text-up" : "text-down"}>{faPct(facts.indexPct)}</span>
            </span>
            <span className="rounded-lg bg-surface-2/80 px-2.5 py-1 font-bold text-ink">
              هم‌وزن: <span className={facts.eqwPct >= 0 ? "text-up" : "text-down"}>{faPct(facts.eqwPct)}</span>
            </span>
            <span className="rounded-lg bg-surface-2/80 px-2.5 py-1 font-bold text-ink">
              💰 {faInt(facts.tradeValueToman)} تومان معامله
            </span>
            <span className="rounded-lg bg-surface-2/80 px-2.5 py-1 font-bold text-ink">
              🧾 {faInt(facts.tradeCount)} معامله
            </span>
          </div>
        )}

        <h3 className="mt-4 text-lg font-black leading-8 sm:text-xl">{digest.headline}</h3>
        <p className="mt-1.5 text-xs leading-6 text-muted sm:text-[13px]">{digest.summary}</p>
      </div>

      {/* هایلایت‌ها — کلیک‌پذیر اگر منبع خبر داشته باشند */}
      <div className="grid grid-cols-1 gap-2.5 p-5 pt-4 sm:grid-cols-2">
        {digest.highlights.map((h, i) => {
          const inner = (
            <>
              <span className="text-base leading-none">{TAG_ICON[h.tag] ?? "📈"}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold leading-5">{h.text}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold text-brand">{h.tag}</span>
                  {h.ref !== null && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted">
                      منبع خبر <ArrowUpRight className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </>
          );
          return h.link ? (
            <a
              key={i}
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
              className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-line/70 bg-surface-2/40 p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand/40"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {inner}
            </a>
          ) : (
            <div key={i} className="animate-fade-up flex items-start gap-2.5 rounded-xl border border-line/70 bg-surface-2/40 p-3.5" style={{ animationDelay: `${i * 60}ms` }}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-line/60 px-5 py-2.5 text-[9px] text-muted/70">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> تولید هوش مصنوعی از داده‌های واقعی امروز — بدون هیچ عدد ساخته‌شده
        </span>
        <Link href="/news" className="font-bold text-brand hover:underline">
          همه اخبار →
        </Link>
      </div>
    </section>
  );
}
