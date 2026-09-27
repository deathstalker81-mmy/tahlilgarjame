"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChartCandlestick,
  Coins,
  FileText,
  Gauge,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Candle, Quote } from "@/types/market";
import { faDate, faInt, faPct, faPrice, faSigned, faTime, faVolume, faToman } from "@/lib/format";
import { useFlashClass } from "@/hooks/anim";
import { TechnicalSection } from "@/components/TechnicalSection";
import { FundamentalSection } from "@/components/FundamentalSection";
import { StarButton } from "@/components/StarButton";
import { AlertButton } from "@/components/PriceAlerts";
import { CompanyLogo } from "@/components/CompanyLogo";
import { RangeBar } from "@/components/RangeBar";
import { CodalSection } from "@/components/CodalSection";
import { ClientFlowCard } from "@/components/ClientFlowCard";
import { PeersCard } from "@/components/PeersCard";
import { FinancialGlance, type Snapshot } from "@/components/FinancialGlance";
import type { AiResult } from "@/components/TechnicalAI";
import type { FundamentalData } from "@/components/FundamentalSection";
import { VerdictCard } from "@/components/VerdictCard";

/* ---------- درباره شرکت ---------- */
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

function AboutCompany({ insCode }: { insCode: string }) {
  const [data, setData] = useState<AboutData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/about`);
        const json = await res.json();
        if (alive && json.ok) setData(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [insCode]);

  if (!data)
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-3 h-3 w-full" />
        <div className="skeleton mt-2 h-3 w-2/3" />
      </div>
    );

  const text = data.profile?.about ?? data.subjectRaw;
  const isAi = Boolean(data.profile);
  const long = (text?.length ?? 0) > 260;
  const shown = long && !expanded ? text?.slice(0, 260) + "…" : text;
  const maxShPct = Math.max(...data.shareholders.map((s) => s.pct), 1);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-bold">درباره شرکت</h2>
        {isAi && (
          <span className="flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
            تحقیق هوش مصنوعی
          </span>
        )}
        <span className="ms-auto flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
          {data.marketTitle && <span>📍 {data.marketTitle}</span>}
          {data.listedSince && <span>🏢 در بورس از سال {data.listedSince}</span>}
          {data.manager && <span>👤 مدیرعامل: {data.manager}</span>}
          {data.city && <span>🏙 {data.city}</span>}
          {data.phone && <span className="num" dir="ltr">📞 {data.phone}</span>}
        </span>
      </div>

      <p className="mt-3 text-xs leading-7 text-ink/90 sm:text-[13px]">{shown || "اطلاعاتی در دسترس نیست"}</p>
      {long && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[11px] font-semibold text-brand hover:underline"
        >
          {expanded ? "نمایش کمتر" : "ادامه متن"}
        </button>
      )}

      {data.profile && data.profile.keyPoints.length > 0 && (
        <div className="mt-4 rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
          <div className="mb-2 text-[10px] font-bold text-muted">نکات کلیدی که سرمایه‌گذار باید بداند</div>
          <ul className="space-y-1.5">
            {data.profile.keyPoints.map((k, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-5 text-ink/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.profile && data.profile.products.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-bold text-muted">محصولات و خدمات اصلی</div>
            <div className="flex flex-wrap gap-1.5">
              {data.profile.products.map((p, i) => (
                <span key={i} className="rounded-lg border border-line bg-surface-2/60 px-2 py-1 text-[10px] text-muted">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.shareholders.length > 0 && (
          <div>
            <div className="mb-2 text-[10px] font-bold text-muted">سهامداران عمده</div>
            <div className="space-y-1.5">
              {data.shareholders.slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-40 truncate text-[10px] text-muted" title={s.name}>
                    {s.name}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand/70" style={{ width: `${(s.pct / maxShPct) * 100}%` }} />
                  </div>
                  <span className="num w-12 text-end text-[10px] font-bold">{s.pct.toLocaleString("fa-IR")}٪</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- بخش‌های آمار ---------- */
function SectionTitle({ icon: Icon, title, desc }: { icon: typeof Gauge; title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <Icon className="h-4 w-4 text-brand" />
        {title}
      </div>
      {desc && <p className="mt-1 text-[10px] leading-5 text-muted/80">{desc}</p>}
    </div>
  );
}

function Mini({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3">
      <div className="text-[10px] text-muted">{label}</div>
      <div className={`num mt-1 text-sm font-bold ${strong ? "text-base" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------- نمای اصلی سهم ---------- */
export function StockView({ insCode }: { insCode: string }) {
  const [data, setData] = useState<{ quote: Quote; chart: Candle[] } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tech" | "fund" | "codal">("tech");
  const [retryKey, setRetryKey] = useState(0);
  const [flash, setFlash] = useState(false);
  const [ctx, setCtx] = useState<{ indexPct: number; sectorPct: number | null; sectorName: string | null } | null>(null);
  const [analysisSignal, setAnalysisSignal] = useState(0);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(true);
  /* نتایج تحلیل‌ها اینجا نگه داشته می‌شوند تا با تعویض تب از بین نروند */
  const [techResult, setTechResult] = useState<AiResult | null>(null);
  const [fundResult, setFundResult] = useState<FundamentalData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/context`);
        const json = await res.json();
        if (alive && json.ok) setCtx(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [insCode]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/financials`);
        const json = await res.json();
        if (alive && json.ok) setSnap(json.data.snapshot);
      } catch {
        /* ignore */
      } finally {
        if (alive) setSnapLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [insCode]);

  /* هوک‌های فلش — قبل از هر return شرطی (قانون React) */
  const q0 = data?.quote;
  const lastFlash = useFlashClass(q0?.last ?? 0);
  const closeFlash = useFlashClass(q0?.closing ?? 0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}`);
        const json = await res.json();
        if (alive && json.ok) {
          setData(json.data);
          setError(false);
          setFlash(true);
          setTimeout(() => alive && setFlash(false), 700);
        } else if (alive) setError(true);
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [insCode, retryKey]);

  if (loading)
    return (
      <div className="space-y-4 pt-4">
        <div className="skeleton h-32 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-48" />
          ))}
        </div>
      </div>
    );

  if (error && !data)
    return (
      <div className="card mt-8 flex flex-col items-center gap-4 p-10 text-center">
        <p className="text-sm text-muted">خطا در دریافت اطلاعات سهم — سرور یا منبع داده در دسترس نیست</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              setRetryKey((k) => k + 1);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-soft px-5 py-2 text-sm font-semibold text-brand transition-transform active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> تلاش مجدد
          </button>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-brand">
            <ArrowRight className="h-4 w-4" /> بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    );

  const q = data!.quote;
  const up = q.lastPct >= 0;
  const peStock = q.eps && q.eps > 0 ? q.last / q.eps : null;
  const peIndustry = q.sectorPE;

  /* وضعیت چسبیدن به سقف/کف مجاز (تشخیص قطعی فاصله — «صف» فقط با دفتر سفارش قابل تایید است) */
  let queueBadge: { text: string; cls: string } | null = null;
  if (q.allowedMax && q.allowedMin) {
    if (q.last >= q.allowedMax) queueBadge = { text: "🚀 چسبیده به سقف مجاز", cls: "bg-up/15 text-up border-up/40" };
    else if (q.last <= q.allowedMin) queueBadge = { text: "🩸 چسبیده به کف مجاز", cls: "bg-down/15 text-down border-down/40" };
    else if (q.last >= q.allowedMax * 0.97) queueBadge = { text: "نزدیک سقف", cls: "bg-gold/15 text-gold border-gold/40" };
    else if (q.last <= q.allowedMin * 1.03) queueBadge = { text: "نزدیک کف", cls: "bg-gold/15 text-gold border-gold/40" };
  }

  return (
    <div className="space-y-5 pt-2">
      {/* هدر سهم */}
      <div className="card animate-fade-up relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-brand-soft blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-muted transition-colors hover:text-ink"
              aria-label="بازگشت"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <CompanyLogo insId={q.insId} symbol={q.symbol || "?"} size={56} />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{q.symbol || "—"}</h1>
                <StarButton insCode={insCode} symbol={q.symbol} name={q.name} size="md" />
                {q.type && (
                  <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                    {q.type}
                  </span>
                )}
                {q.state && (
                  <span className="rounded-lg bg-surface-2 px-2 py-1 text-[10px] text-muted">{q.state}</span>
                )}
                {queueBadge && (
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${queueBadge.cls}`}>
                    {queueBadge.text}
                  </span>
                )}
              </div>
              <div className="mt-1.5 text-xs text-muted sm:text-sm">
                {q.name || "—"}
                {q.marketTitle ? ` · ${q.marketTitle}` : q.sectorName ? ` · ${q.sectorName}` : ""}
              </div>
            </div>
          </div>

          <div className="ms-auto flex items-end gap-4">
            <div className="text-left">
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted">
                آخرین معامله
                <span
                  title="بروزرسانی خودکار هر ۱۰ ثانیه"
                  className={`h-2 w-2 rounded-full transition-all duration-500 ${flash ? "scale-125 bg-up" : "bg-muted/40"}`}
                />
              </div>
              <div className={`num text-4xl font-black ${up ? "text-up" : "text-down"}`}>{faPrice(q.last)}</div>
            </div>
            <span className={up ? "pill-up" : "pill-down"}>{faPct(q.lastPct)}</span>
            <AlertButton insCode={insCode} symbol={q.symbol || "—"} currentPrice={q.last} />
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[11px] text-muted">
          <span>{faDate(q.date)}</span>
          <span>ساعت {faTime(q.time)}</span>
        </div>
      </div>

      <AboutCompany insCode={insCode} />

      {/* آمار */}
      <div className="grid animate-fade-up grid-cols-1 gap-4 lg:grid-cols-2">        {/* حرکت امروز */}
        <div className="card p-5">
          <SectionTitle icon={Gauge} title="حرکت امروز" />

          {/* دو عدد اصلی — آخرین و پایانی */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl border p-4 text-center ${up ? "border-up/30 bg-up/5" : "border-down/30 bg-down/5"}`}>
              <div className="text-[11px] text-muted">آخرین معامله</div>
              <div
                key={`last-${lastFlash.key}`}
                className={`num mt-1 rounded-lg py-0.5 text-3xl font-black transition-colors ${lastFlash.cls} ${up ? "text-up" : "text-down"}`}
              >
                {faPrice(q.last)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className={up ? "pill-up" : "pill-down"}>{faPct(q.lastPct)}</span>
                <span className="num rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted">
                  {faSigned(q.last - q.yesterday)} ریال از دیروز
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4 text-center">
              <div className="text-[11px] text-muted">قیمت پایانی (میانگین واقعی)</div>
              <div
                key={`close-${closeFlash.key}`}
                className={`num mt-1 rounded-lg py-0.5 text-3xl font-black text-ink transition-colors ${closeFlash.cls}`}
              >
                {faPrice(q.closing)}
              </div>
              <span className={`mt-2 inline-block ${q.closingPct >= 0 ? "pill-up" : "pill-down"}`}>{faPct(q.closingPct)}</span>
            </div>
          </div>

          {/* مقایسه با بازار و صنعت */}
          {ctx && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2 text-center">
                <div className="text-[9px] text-muted">شاخص کل</div>
                <div className="num mt-0.5 text-xs font-bold">{faPct(ctx.indexPct)}</div>
              </div>
              <div className="rounded-xl border border-line/60 bg-surface-2/40 p-2 text-center">
                <div className="truncate text-[9px] text-muted">صنعت {ctx.sectorName ?? ""}</div>
                <div className="num mt-0.5 text-xs font-bold">{ctx.sectorPct !== null ? faPct(ctx.sectorPct) : "—"}</div>
              </div>
              <div className={`rounded-xl border p-2 text-center ${ctx.sectorPct !== null && q.lastPct >= ctx.sectorPct ? "border-up/40 bg-up/10" : "border-down/40 bg-down/10"}`}>
                <div className="text-[9px] text-muted">سهم نسبت به صنعتش</div>
                <div className="num mt-0.5 text-xs font-black">
                  {ctx.sectorPct !== null ? faSigned(Math.round((q.lastPct - ctx.sectorPct) * 100) / 100) + "٪" : "—"}
                </div>
              </div>
            </div>
          )}

          {/* جا تا سقف/کف — به زبان ساده */}
          {q.allowedMax && q.allowedMin && q.last > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line/70 bg-surface-2/40 p-3 text-[11px] font-semibold">
              <span className="text-muted">از اینجا…</span>
              <span className="rounded-lg bg-up/10 px-2.5 py-1">
                تا سقف مجاز: <span className="num font-black text-up">{faPct(((q.allowedMax - q.last) / q.last) * 100)}</span> جا داره 🚀
              </span>
              <span className="rounded-lg bg-down/10 px-2.5 py-1">
                تا کف مجاز: <span className="num font-black text-down">{faPct(((q.allowedMin - q.last) / q.last) * 100)}</span> فاصله 🩸
              </span>
            </div>
          )}

          {/* نوار جای قیمت */}
          <div className="mt-3">
            <RangeBar
              low={q.allowedMin || q.low}
              high={q.allowedMax || q.high}
              value={q.last}
              thirdValue={q.yesterday}
              thirdLabel="دیروز"
              lowLabel="کف مجاز"
              highLabel="سقف مجاز"
              valueLabel={faPrice(q.last)}
              legend={false}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {(null as unknown as never) === null && [
              { l: "باز", v: faPrice(q.open) },
              { l: "بیشترین", v: faPrice(q.high) },
              { l: "کمترین", v: faPrice(q.low) },
              { l: "EPS", v: q.eps !== null ? faPrice(q.eps) : "—" },
            ].map((it) => (
              <div key={it.l} className="rounded-lg border border-line/60 bg-surface-2/40 px-2 py-1.5 text-center">
                <div className="text-[9px] text-muted">{it.l}</div>
                <div className="num text-[11px] font-bold">{it.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ارزش‌گذاری */}
        {/* ارزش‌گذاری — امتیاز چندعاملی */}
        <div className="card p-5">
          <SectionTitle icon={Coins} title="ارزش‌گذاری — سهم ارزونه یا گرونه؟" />

          {(() => {
            if (snapLoading) return <div className="skeleton h-56 w-full" />;

            const peDiff = peStock && peIndustry ? Math.round((1 - peStock / peIndustry) * 100) : null;
            const yearPos =
              q.yearMin && q.yearMax && q.yearMax > q.yearMin
                ? ((q.last - q.yearMin) / (q.yearMax - q.yearMin)) * 100
                : null;

            const factors: { label: string; value: string; points: number; max: number }[] = [];
            factors.push({
              label: "P/E در برابر صنعت",
              value: peStock && peIndustry ? `${faPrice(peStock)} در برابر ${faPrice(peIndustry)}` : "—",
              points: peDiff !== null ? Math.round(Math.max(Math.min(peDiff, 25), 0)) : 0,
              max: 25,
            });
            const peg = peStock && snap?.profitYoy && snap.profitYoy > 5 ? peStock / snap.profitYoy : null;
            factors.push({
              label: "قیمت نسبت به رشد سود (PEG)",
              value: peg ? faPrice(peg) : "رشد سود نامشخص",
              points: peg === null ? 0 : peg < 0.5 ? 15 : peg < 1 ? 12 : peg < 2 ? 6 : 0,
              max: 15,
            });
            const roeV = snap?.roe ?? null;
            factors.push({
              label: "ROE (بازده سهام‌داران)",
              value: roeV !== null ? `${faPrice(roeV)}٪` : "—",
              points: roeV === null ? 0 : roeV >= 20 ? 20 : roeV >= 12 ? 13 : roeV >= 8 ? 7 : 2,
              max: 20,
            });
            factors.push({
              label: "جای قیمت در بازه یک‌ساله",
              value: yearPos !== null ? `${yearPos.toLocaleString("fa-IR", { maximumFractionDigits: 0 })}٪ از کف` : "—",
              points: yearPos === null ? 0 : yearPos < 33 ? 15 : yearPos <= 66 ? 9 : 3,
              max: 15,
            });
            const de = snap?.debtToEquity ?? null;
            factors.push({
              label: "بدهی به حقوق صاحبان سهام",
              value: de !== null ? faPrice(de) : "—",
              points: de === null ? 0 : de < 0.5 ? 10 : de < 1 ? 8 : de < 2 ? 4 : 1,
              max: 10,
            });
            const gm = snap?.grossMargin ?? null;
            factors.push({
              label: "حاشیه سود ناخالص",
              value: gm !== null ? `${faPrice(gm)}٪` : "—",
              points: gm === null ? 0 : gm >= 30 ? 10 : gm >= 15 ? 7 : gm >= 8 ? 4 : 1,
              max: 10,
            });

            const total = factors.reduce((a, f) => a + f.points, 0);
            const verdict =
              total >= 70
                ? { text: "ارزش خرید قوی دارد ✅", cls: "bg-up/15 text-up border-up/40" }
                : total >= 55
                  ? { text: "ارزش خرید دارد ✅", cls: "bg-up/15 text-up border-up/40" }
                  : total >= 40
                    ? { text: "قیمت منصفانه 🤝", cls: "bg-gold/15 text-gold border-gold/40" }
                    : { text: "گران است ❌", cls: "bg-down/15 text-down border-down/40" };
            const maxF = Math.max(...factors.map((f) => f.max), 1);

            return (
              <>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {factors.map((f) => (
                    <div key={f.label} className="rounded-xl border border-line/70 bg-surface-2/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-muted">{f.label}</span>
                        <span
                          className={`num shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                            f.points >= f.max * 0.6 ? "bg-up/15 text-up" : f.points >= f.max * 0.3 ? "bg-gold/15 text-gold" : "bg-down/10 text-down"
                          }`}
                        >
                          {f.points.toLocaleString("fa-IR")} / {f.max.toLocaleString("fa-IR")}
                        </span>
                      </div>
                      <div className="num mt-1 text-xs font-black text-ink">{f.value}</div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            f.points >= f.max * 0.6 ? "bg-up" : f.points >= f.max * 0.3 ? "bg-gold" : "bg-down/70"
                          }`}
                          style={{ width: `${(f.points / maxF) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`mt-3 rounded-2xl border p-4 text-center ${verdict.cls}`}>
                  <div className="text-base font-black">{verdict.text}</div>
                  <div className="num mt-1 text-[10px] opacity-90">
                    امتیاز ارزش‌گذاری: {total.toLocaleString("fa-IR")} از ۱۰۰ — جمع شش عامل بالا
                  </div>
                </div>
              </>
            );
          })()}

          {peStock && peIndustry && (
            <div className="num mt-3 border-t border-line/60 pt-2 text-center text-[10px] text-muted">
              P/E یعنی با سود فعلی شرکت، چند سال طول می‌کشد قیمت سهم جبران شود
            </div>
          )}
          {q.yearMin && q.yearMax && (
            <div className="mt-3">
              <RangeBar
                low={q.yearMin}
                high={q.yearMax}
                value={q.last}
                lowLabel="کمترین سال"
                highLabel="بیشترین سال"
                valueLabel={faPrice(q.last)}
                legend={false}
              />
            </div>
          )}

          <p className="mt-3 border-t border-line/60 pt-2 text-[9px] leading-4 text-muted/70">
            امتیاز از ۶ شاخص قطعی (P/E، PEG، ROE، جای بازه، بدهی، حاشیه) از صورت‌های مالی کدال — تحلیل کامل‌تر در تب فاندامنتال
          </p>
        </div>

        {/* حجم و ارزش معاملات */}
        <div className="card p-5 lg:col-span-2">
          <SectionTitle icon={BarChart3} title="حجم و ارزش معاملات" />

          {/* مقایسه بصری حجم امروز با میانگین ماه */}
          {q.monthAvgVolume && q.monthAvgVolume > 0 && (
            <div className="mb-4 rounded-2xl border border-line/70 bg-surface-2/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted">حجم امروز در برابر میانگین ماه</span>
                {(() => {
                  const ratio = q.volume / q.monthAvgVolume;
                  let badge: { text: string; cls: string };
                  if (ratio >= 2) badge = { text: "🔥🔥 پول سنگین وارد شده", cls: "bg-up/15 text-up" };
                  else if (ratio >= 1.3) badge = { text: "🔥 استقبال بالاتر از معمول", cls: "bg-up/15 text-up" };
                  else if (ratio >= 0.7) badge = { text: "حجم معمولی", cls: "bg-surface-2 text-muted" };
                  else badge = { text: "🥀 رقیق — کم‌استقبال", cls: "bg-gold/15 text-gold" };
                  return (
                    <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${badge.cls}`}>
                      {ratio.toLocaleString("fa-IR", { maximumFractionDigits: 2 })}× میانگین — {badge.text}
                    </span>
                  );
                })()}
              </div>
              {(() => {
                const maxV = Math.max(q.volume, q.monthAvgVolume);
                return (
                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="text-muted">میانگین ماه</span>
                        <span className="num font-bold text-ink">{faVolume(q.monthAvgVolume)}</span>
                      </div>
                      <div className="h-3.5 w-full overflow-hidden rounded-lg bg-surface-2">
                        <div className="h-full rounded-lg bg-muted/50" style={{ width: `${(q.monthAvgVolume / maxV) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-ink">امروز</span>
                        <span className="num font-bold text-ink">{faVolume(q.volume)}</span>
                      </div>
                      <div className="h-3.5 w-full overflow-hidden rounded-lg bg-surface-2">
                        <div
                          className={`h-full rounded-lg ${q.volume >= q.monthAvgVolume ? "bg-gradient-to-l from-up to-emerald-400" : "bg-gradient-to-l from-gold to-amber-400"}`}
                          style={{ width: `${(q.volume / maxV) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* سه عدد کلیدی به تومان */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
              <div className="text-[10px] text-muted">💰 ارزش کل معاملات امروز</div>
              <div className="num mt-1 text-sm font-black">{faToman(q.value)}</div>
            </div>
            <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
              <div className="text-[10px] text-muted">🧾 تعداد معاملات</div>
              <div className="num mt-1 text-sm font-black">{faInt(q.trades)}</div>
            </div>
            <div className="rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
              <div className="text-[10px] text-muted">📏 میانگین هر معامله</div>
              <div className="num mt-1 text-sm font-black">
                {q.trades > 0 ? faToman(q.value / q.trades) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* در یک نگاه مالی */}
      <FinancialGlance snapshot={snap} loading={snapLoading} />

      {/* پول حقیقی/حقوقی + هم‌گروهی‌ها */}
      <div className="grid animate-fade-up grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientFlowCard insCode={insCode} priceUp={up} />
        <PeersCard insCode={insCode} sectorName={q.sectorName} />
      </div>

      {/* تب‌های تحلیل */}
      <div>
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("tech")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === "tech" ? "bg-brand-soft text-brand shadow-card" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <ChartCandlestick className="h-4 w-4" /> تحلیل تکنیکال
          </button>
          <button
            onClick={() => setTab("fund")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === "fund" ? "bg-brand-soft text-brand shadow-card" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <BrainIcon /> تحلیل فاندامنتال
          </button>
          <button
            onClick={() => setTab("codal")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === "codal" ? "bg-brand-soft text-brand shadow-card" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <FileText className="h-4 w-4" /> کدال
          </button>
        </div>

        {/* محتوای تب — با کلید برای انیمیشن تعویض */}
        <div key={tab} className="animate-fade-up">
          {tab === "tech" ? (
            data!.chart.length > 0 ? (
              <TechnicalSection
                insCode={insCode}
                quote={q}
                dailyCandles={data!.chart}
                initialAi={techResult}
                onAiResult={(result) => {
                  setTechResult(result);
                  setAnalysisSignal((s) => s + 1);
                }}
              />
            ) : (
              <div className="card p-8 text-center text-sm text-muted">
                داده تاریخی این نماد در دسترس نیست
              </div>
            )
          ) : tab === "fund" ? (
            <FundamentalSection insCode={insCode} initialData={fundResult} onResult={setFundResult} />
          ) : (
            <CodalSection insCode={insCode} />
          )}
        </div>
      </div>

      {/* جمع‌بندی نهایی — فقط بعد از انجام هر دو تحلیل */}
      <VerdictCard insCode={insCode} refreshSignal={analysisSignal} />

      {error && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted">
          <RefreshCw className="h-3.5 w-3.5" /> بروزرسانی بعدی با خطا مواجه شد؛ در حال تلاش مجدد…
        </div>
      )}
    </div>
  );
}

function BrainIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 10-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 1012 18Z" />
      <path d="M12 5a3 3 0 015.997.125 4 4 0 012.526 5.77 4 4 0 01-.556 6.588A4 4 0 1112 18Z" />
      <path d="M15 13a4.5 4.5 0 01-3-4 4.5 4.5 0 01-3 4" />
      <path d="M17.599 6.5a3 3 0 00.399-1.375" />
    </svg>
  );
}
