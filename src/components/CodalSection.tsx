"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Sparkles, Star } from "lucide-react";
import { faDateTime } from "@/lib/format";

interface CodalLetter {
  tracingNo: number;
  title: string;
  publishDateTime: string;
  pubDate: number;
  url: string;
  category: string;
  important: boolean;
}

interface Extraction {
  items: { title: string; why: string; impact: "مثبت" | "منفی" | "خنثی" }[];
  updatedAt: number;
}

interface CodalData {
  letters: CodalLetter[];
  extraction: Extraction | null;
  aiError: string | null;
}

/* ---------- تحلیل عمیق صورت‌های کدال ---------- */
interface DeepAnalysis {
  pnl: { salesYoy: string | null; profitYoy: string | null; grossMargin: string | null; trend: string | null; comment: string } | null;
  monthlySales: { yoy: string | null; trend: string | null; comment: string } | null;
  cashFlow: { operating: string | null; prior: string | null; comment: string } | null;
  development: { plans: string[]; comment: string } | null;
  confidence: number;
}

function DeepAnalysisCard({ insCode }: { insCode: string }) {
  const [data, setData] = useState<{ analysis: DeepAnalysis | null; aiError: string | null; sources: { title: string; kind: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/codal-analysis`);
        const json = await res.json();
        if (alive && json.ok) setData(json.data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [insCode]);

  if (loading)
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> در حال خواندن صورت‌های مالی از کدال…
        </div>
        <div className="skeleton mt-3 h-3 w-full" />
        <div className="skeleton mt-2 h-3 w-3/4" />
      </div>
    );

  if (!data || !data.analysis)
    return null;

  const a = data.analysis;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
      <div className="mb-2 text-[11px] font-black text-ink">{title}</div>
      {children}
    </div>
  );

  return (
    <div className="rounded-2xl border border-brand/30 bg-gradient-to-l from-brand-soft/50 to-transparent p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">🔬</span>
        <h3 className="text-sm font-black">تحلیل عمیق اسناد کدال</h3>
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold text-brand">
          AI صورت‌ها را خوانده — اطمینان {a.confidence?.toLocaleString("fa-IR")}٪
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {a.pnl && (
          <Section title="📊 سود و زیان">
            <div className="mb-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
              {a.pnl.salesYoy && <span className="rounded bg-surface-2 px-1.5 py-0.5">فروش: {a.pnl.salesYoy}</span>}
              {a.pnl.profitYoy && <span className="rounded bg-surface-2 px-1.5 py-0.5">سود خالص: {a.pnl.profitYoy}</span>}
              {a.pnl.grossMargin && <span className="rounded bg-surface-2 px-1.5 py-0.5">حاشیه ناخالص: {a.pnl.grossMargin}</span>}
            </div>
            <p className="text-[11px] leading-5 text-muted">{a.pnl.comment}</p>
          </Section>
        )}
        {a.monthlySales && (
          <Section title="📦 گزارش ماهانه فروش">
            <div className="mb-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
              {a.monthlySales.yoy && <span className="rounded bg-surface-2 px-1.5 py-0.5">نسبت به سال قبل: {a.monthlySales.yoy}</span>}
              {a.monthlySales.trend && <span className="rounded bg-surface-2 px-1.5 py-0.5">{a.monthlySales.trend}</span>}
            </div>
            <p className="text-[11px] leading-5 text-muted">{a.monthlySales.comment}</p>
          </Section>
        )}
        {a.cashFlow && (
          <Section title="💵 جریان نقد عملیاتی (مهم‌تر از سود)">
            <div className="mb-1.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
              {a.cashFlow.operating && <span className="rounded bg-surface-2 px-1.5 py-0.5">جاری: {a.cashFlow.operating}</span>}
              {a.cashFlow.prior && <span className="rounded bg-surface-2 px-1.5 py-0.5">قبلی: {a.cashFlow.prior}</span>}
            </div>
            <p className="text-[11px] leading-5 text-muted">{a.cashFlow.comment}</p>
          </Section>
        )}
        {a.development && (
          <Section title="🏗 طرح‌های توسعه‌ای">
            {a.development.plans?.length > 0 ? (
              <ul className="space-y-1">
                {a.development.plans.slice(0, 4).map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] leading-5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" /> {p}
                  </li>
                ))}
              </ul>
            ) : null}
            {a.development.comment && <p className="mt-1 text-[11px] leading-5 text-muted">{a.development.comment}</p>}
          </Section>
        )}
      </div>

      <p className="mt-2.5 border-t border-line/60 pt-2 text-[9px] text-muted/70">
        خوانده‌شده از: {data.sources.map((s) => s.title.slice(0, 45)).join(" · ") || "کدال"} — فقط اعداد موجود در اسناد
      </p>
    </div>
  );
}

function categoryColor(c: string): string {
  if (c.includes("بااهمیت")) return "bg-down/15 text-down";
  if (c.includes("سرمایه")) return "bg-brand-soft text-brand";
  if (c.includes("مجمع")) return "bg-gold/15 text-gold";
  if (c.includes("مالی")) return "bg-up/15 text-up";
  return "bg-surface-2 text-muted";
}

function impactPill(i: string) {
  if (i === "مثبت") return "bg-up/15 text-up";
  if (i === "منفی") return "bg-down/15 text-down";
  return "bg-surface-2 text-muted";
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export function CodalSection({ insCode }: { insCode: string }) {
  const [data, setData] = useState<CodalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);

  const load = async (withExtraction?: boolean) => {
    try {
      const res = await fetch(`/api/stock/${insCode}/codal`);
      const json = await res.json();
      if (json.ok) setData(json.data);
      return json.data as CodalData | undefined;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await load();
        /* اگر استخراجی نبود، اولین بار خودکار بساز */
        if (alive && d && !d.extraction && d.aiError === null) {
          void extract();
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insCode]);

  const extract = async () => {
    setExtracting(true);
    try {
      const res = await fetch(`/api/stock/${insCode}/codal`);
      const json = await res.json();
      if (json.ok) setData(json.data);
    } finally {
      setExtracting(false);
    }
  };

  /* خلاصه روایی «چه خبرا بوده» — هر کلیک تازه */
  const [story, setStory] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const tellStory = async () => {
    setStoryLoading(true);
    setStoryError(null);
    try {
      const res = await fetch(`/api/stock/${insCode}/codal-digest`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error === "NO_KEY" ? "NO_KEY" : "خطا در تولید خلاصه");
      setStory(json.data.story);
    } catch (err) {
      setStoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setStoryLoading(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" />
        ))}
      </div>
    );

  if (!data || data.letters.length === 0)
    return (
      <div className="card p-8 text-center text-sm text-muted">
        اطلاعیه‌ای از کدال برای این نماد پیدا نشد
      </div>
    );

  /* ادغام: استخراج AI روی خود ردیف‌ها سوار می‌شود */
  const exMap = new Map<string, { why: string; impact: string }>();
  if (data.extraction) {
    for (const item of data.extraction.items) {
      const key = norm(item.title).slice(0, 30);
      exMap.set(key, { why: item.why, impact: item.impact });
    }
  }
  const match = (title: string) => {
    const t = norm(title);
    for (const [key, val] of exMap) {
      if (t.includes(key) || key.includes(t.slice(0, 30))) return val;
    }
    return null;
  };

  const extractingNow = extracting;

  return (
    <div className="space-y-4">
      <DeepAnalysisCard insCode={insCode} />

      {/* خلاصه روایی — هر کلیک تازه */}
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-l from-gold/10 to-transparent p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">🎙</span>
          <span className="text-xs font-bold">چه خبرا بوده؟</span>
          <span className="text-[10px] text-muted">خلاصه روایی AI از اطلاعیه‌های اخیر</span>
          <button
            onClick={tellStory}
            disabled={storyLoading}
            className="ms-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-gold to-amber-500 px-4 py-2 text-[11px] font-black text-white shadow-card transition-transform hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {storyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {storyLoading ? "در حال خوندن اطلاعیه‌ها…" : story ? "یه بار دیگه تعریف کن" : "بگو چه خبرا بوده"}
          </button>
        </div>
        {storyError && (
          <p className="mt-2 text-[10px] text-down">
            {storyError === "NO_KEY" ? "برای خلاصه، کلید AvalAI لازم است" : storyError}
          </p>
        )}
        {story && !storyLoading && (
          <p className="mt-3 animate-fade-up rounded-xl bg-surface-2/70 p-3 text-xs leading-7">{story}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FileText className="h-4 w-4 text-brand" /> اطلاعیه‌های رسمی کدال
        </h3>
        <span className="text-[10px] text-muted">
          {data.extraction ? "— مهم‌ها با تحلیل هوش مصنوعی برجسته شده‌اند" : "— برای تحلیل، دکمه استخراج را بزن"}
        </span>
        <button
          onClick={extract}
          disabled={extractingNow}
          className="ms-auto flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[11px] font-bold text-white transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {extractingNow ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {data.extraction ? "استخراج مجدد" : "استخراج هوشمند"}
        </button>
      </div>

      <div className="space-y-2.5">
        {data.letters.map((l) => {
          const ex = match(l.title);
          const highlighted = Boolean(ex) || l.important;
          return (
            <a
              key={l.tracingNo}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block rounded-xl border p-4 transition-colors ${
                highlighted
                  ? "border-brand/30 bg-brand-soft/30 hover:border-brand/60"
                  : "border-line bg-surface-2/40 hover:bg-surface-2/70"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {ex || l.important ? (
                  <Star className={`mt-0.5 h-4 w-4 shrink-0 ${ex ? "text-brand" : "text-gold"}`} />
                ) : (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted/50" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold leading-6">{l.title}</div>
                    <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted/50" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                    <span className={`rounded-md px-1.5 py-0.5 font-semibold ${categoryColor(l.category)}`}>
                      {l.category}
                    </span>
                    {ex && (
                      <span className={`rounded-md px-1.5 py-0.5 font-bold ${impactPill(ex.impact)}`}>
                        اثر: {ex.impact}
                      </span>
                    )}
                    {l.pubDate > 0 ? (
                      <span className="num font-bold text-ink/80">🗓 {faDateTime(l.pubDate)}</span>
                    ) : (
                      <span className="num font-bold text-ink/80">{l.publishDateTime}</span>
                    )}
                  </div>
                  {ex && <p className="mt-1.5 text-[11px] leading-5 text-muted">{ex.why}</p>}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-muted/70">
        منبع: codal.ir — اطلاعیه‌های رسمی و مسئولانه شرکت (هر ۵ دقیقه بروزرسانی)
      </p>
    </div>
  );
}
