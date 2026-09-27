"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Check,
  Loader2,
  Newspaper,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { faDateTime, faPct, faPrice } from "@/lib/format";

interface Claim {
  text: string;
  evidence: string;
}

interface Analysis {
  score: number;
  conclusion: "خرید" | "هولد" | "فروش";
  confidence: number;
  summary: string;
  positives: Claim[];
  negatives: Claim[];
  risks: string[];
  horizon: string;
  verified?: { checked: number; removed: number };
}

interface TaggedNews {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  category: string;
  sentiment: string;
  impact: number;
  reason: string;
  scope: "سهم" | "کلان";
}

export interface FundamentalData {
  financials: {
    symbol: string;
    name: string;
    price: number;
    lastPct: number;
    eps: number | null;
    pe: string | null;
    sectorName: string | null;
    sectorPE: number | null;
    yearMin: number | null;
    yearMax: number | null;
  };
  news: TaggedNews[];
  analysis: Analysis | null;
  aiError: string | null;
  codalCount: number;
  updatedAt: number;
}

const steps = [
  "جمع‌آوری داده‌های خام و اخبار",
  "غربال اخبار مهم از بی‌اهمیت",
  "صحت‌سنجی و طبقه‌بندی اخبار",
  "تحلیل مالی و بنیادی سهم",
  "تدوین پیشنهاد نهایی",
];

function ScoreRing({ score }: { score: number }) {
  const color = score >= 65 ? "#22C55E" : score >= 45 ? "#F59E0B" : "#EF4444";
  const r = 34;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" className="text-surface-2" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-xl font-bold" style={{ color }}>
          {score.toLocaleString("fa-IR")}
        </span>
        <span className="text-[9px] text-muted">از ۱۰۰</span>
      </div>
    </div>
  );
}

function NewsCard({ n }: { n: TaggedNews }) {
  const pos = n.sentiment === "مثبت";
  const neg = n.sentiment === "منفی";
  return (
    <a
      href={n.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-line bg-surface-2/50 p-4 transition-colors hover:border-brand/40 hover:bg-brand-soft/30"
    >
      <div className="flex items-start gap-2.5">
        <Newspaper className="mt-1 h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs font-semibold leading-6">{n.title}</div>
            <ExternalLinkIcon />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-semibold text-brand">{n.category}</span>
            <span>{n.source}</span>
            {n.pubDate > 0 && <span>{faDateTime(n.pubDate)}</span>}
            <span className={`rounded-md px-1.5 py-0.5 font-semibold ${pos ? "bg-up/15 text-up" : neg ? "bg-down/15 text-down" : "bg-surface-2 text-muted"}`}>
              {n.sentiment} · اثر {n.impact.toLocaleString("fa-IR")}٪
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-5 text-muted">{n.reason}</p>
        </div>
      </div>
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="mt-1 h-3 w-3 shrink-0 text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

export function FundamentalSection({
  insCode,
  initialData,
  onResult,
}: {
  insCode: string;
  initialData?: FundamentalData | null;
  onResult?: (d: FundamentalData | null) => void;
}) {
  const [data, setData] = useState<FundamentalData | null>(initialData ?? null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    initialData?.analysis ? "done" : "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const analyze = async () => {
    setState("loading");
    setStep(0);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 5000);
    try {
      const res = await fetch(`/api/stock/${insCode}/fundamental`);
      const json = await res.json();
      if (!json.ok) throw new Error("خطای سرور");
      if (json.data.aiError === "NO_KEY") throw new Error("NO_KEY");
      setData(json.data);
      onResult?.(json.data);
      setState("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  };

  const f = data?.financials;

  const chips = f
    ? [
        { label: "EPS", value: f.eps !== null ? faPrice(f.eps) : "—" },
        { label: "P/E سهم", value: f.eps && f.eps > 0 ? faPrice(f.price / f.eps) : "—" },
        { label: "P/E صنعت", value: f.sectorPE ? faPrice(f.sectorPE) : "—" },
        { label: "گروه صناعتی", value: f.sectorName ?? "—" },
        {
          label: "فاصله از سقف سال",
          value: f.yearMax ? faPct(((f.price - f.yearMax) / f.yearMax) * 100) : "—",
        },
        {
          label: "فاصله از کف سال",
          value: f.yearMin ? faPct(((f.price - f.yearMin) / f.yearMin) * 100) : "—",
        },
      ]
    : [];

  /* ---------- حالت اولیه ---------- */
  if (state === "idle")
    return (
      <div className="space-y-5">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-500 shadow-glass">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold">پایپ‌لاین ۵ مرحله‌ای فاندامنتال</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-muted">
              AI داده‌های خام و اخبار را جمع می‌کند، مهم‌ها را غربال می‌کند، صحت‌سنجی و طبقه‌بندی می‌کند، مثبت‌ها
              و منفی‌ها و ریسک‌ها را تحلیل می‌کند و در پایان پیشنهاد نهایی می‌دهد.
            </p>
          </div>
          <button
            onClick={analyze}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:opacity-90 active:scale-95"
          >
            <Sparkles className="h-4 w-4" /> شروع تحلیل فاندامنتال
          </button>
        </div>
      </div>
    );

  /* ---------- لودینگ ---------- */
  if (state === "loading")
    return (
      <div className="card p-8">
        <div className="mb-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <h3 className="text-base font-bold">پایپ‌لاین فاندامنتال در حال اجرا…</h3>
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors ${
                  i < step ? "bg-up/20 text-up" : i === step ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : (i + 1).toLocaleString("fa-IR")}
              </div>
              <span className={i <= step ? "font-medium" : "text-muted"}>{s}</span>
              {i === step && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-muted">این فرآیند حدود ۲۰ تا ۴۰ ثانیه طول می‌کشد</p>
      </div>
    );

  /* ---------- خطا ---------- */
  if (state === "error")
    return (
      <div className="card p-8">
        {errMsg === "NO_KEY" ? (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold">اتصال به هوش مصنوعی برقرار نشد</h3>
            <p className="mt-2 text-xs leading-6 text-muted">
              کلید AvalAI را در
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">.env.local</code>
              قرار بده و سرور را ری‌استارت کن.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted">خطا در تحلیل فاندامنتال</p>
            <p className="mt-1 text-[11px] text-muted/70">{errMsg}</p>
            <button
              onClick={analyze}
              className="mt-4 rounded-xl bg-brand-soft px-5 py-2 text-sm font-semibold text-brand transition-transform active:scale-95"
            >
              تلاش مجدد
            </button>
          </div>
        )}
      </div>
    );

  /* ---------- نتیجه ---------- */
  const a = data!.analysis;
  const conclusionStyle =
    a?.conclusion === "خرید"
      ? { bg: "bg-up/15", text: "text-up" }
      : a?.conclusion === "فروش"
        ? { bg: "bg-down/15", text: "text-down" }
        : { bg: "bg-gold/15", text: "text-gold" };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* امتیاز و پیشنهاد */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={a?.score ?? 0} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-lg px-3 py-1 text-sm font-bold ${conclusionStyle.bg} ${conclusionStyle.text}`}>
                پیشنهاد: {a?.conclusion ?? "—"}
              </span>
              {a?.horizon && <span className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-muted">{a.horizon}</span>}
              <button
                onClick={analyze}
                className="ms-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
              >
                <RefreshCw className="h-3.5 w-3.5" /> تحلیل مجدد
              </button>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted">سطح اطمینان AI</span>
                <span className="num font-bold">{(a?.confidence ?? 0).toLocaleString("fa-IR")}٪</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-brand to-violet-400 transition-all duration-700"
                  style={{ width: `${a?.confidence ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {a && <p className="mt-5 text-sm leading-7">{a.summary}</p>}
      </div>

      {/* مثبت / منفی */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 text-sm font-bold text-up">✚ مثبت‌های حال حاضر و پیش‌رو</div>
          <ul className="space-y-2.5">
            {(a?.positives ?? []).map((p, i) => (
              <li key={i} className="rounded-lg border border-up/20 bg-up/5 p-2.5">
                <div className="flex items-start gap-2 text-xs leading-6">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-up" />
                  {p.text}
                </div>
                {p.evidence && <div className="mt-1 ps-6 text-[10px] leading-4 text-muted">شاهد: {p.evidence}</div>}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="mb-3 text-sm font-bold text-down">− منفی‌ها و چالش‌ها</div>
          <ul className="space-y-2.5">
            {(a?.negatives ?? []).map((p, i) => (
              <li key={i} className="rounded-lg border border-down/20 bg-down/5 p-2.5">
                <div className="flex items-start gap-2 text-xs leading-6">
                  <X className="mt-1 h-3.5 w-3.5 shrink-0 text-down" />
                  {p.text}
                </div>
                {p.evidence && <div className="mt-1 ps-6 text-[10px] leading-4 text-muted">شاهد: {p.evidence}</div>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* بج بازبینی */}
      {a?.verified && a.verified.checked > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-up/25 bg-up/5 px-3 py-2 text-[10px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-up" />
          بازبینی مستقل: هر {a.verified.checked.toLocaleString("fa-IR")} ادعا با اخبار و داده‌های خام تطبیق داده شد
          {a.verified.removed > 0
            ? ` — ${a.verified.removed.toLocaleString("fa-IR")} ادعای بدون پشتوانه حذف شد`
            : " — تناقضی پیدا نشد"}
          {data!.codalCount > 0 && (
            <span className="ms-auto rounded-md bg-brand-soft px-2 py-0.5 font-bold text-brand">
              📄 {data!.codalCount.toLocaleString("fa-IR")} اطلاعیه رسمی کدال در تحلیل لحاظ شد
            </span>
          )}
        </div>
      )}

      {/* ریسک‌ها */}
      {a && a.risks.length > 0 && (
        <div className="card border-gold/30 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gold">
            <AlertTriangle className="h-4 w-4" /> ریسک‌هایی که باید بدونی
          </div>
          <ul className="space-y-2">
            {a.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-6">
                <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-gold" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* اخبار صحت‌سنجی‌شده — دو بخش: سهم‌محور / کلان */}
      {data!.news.length > 0 && (
        <div>
          {(() => {
            const company = data!.news.filter((n) => n.scope === "سهم");
            const macro = data!.news.filter((n) => n.scope === "کلان");
            return (
              <>
                {company.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                      <Newspaper className="h-4 w-4 text-brand" />
                      🎯 اخبار مستقیم این سهم
                      <span className="num rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                        {company.length.toLocaleString("fa-IR")}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {company.map((n, i) => (
                        <NewsCard key={i} n={n} />
                      ))}
                    </div>
                  </div>
                )}
                {macro.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                      🌍 اخبار کلان و تاثیرگذار بر سهم
                      <span className="num rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
                        {macro.length.toLocaleString("fa-IR")}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {macro.map((n, i) => (
                        <NewsCard key={i} n={n} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <p className="text-center text-[10px] leading-5 text-muted/70">
        این تحلیل توسط هوش مصنوعی تولید شده و صرفاً جنبه اطلاع‌رسانی دارد؛ توصیه خرید و فروش نیست. آخرین بروزرسانی:{" "}
        {new Date(data!.updatedAt).toLocaleTimeString("fa-IR")}
      </p>
    </div>
  );
}
