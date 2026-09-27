"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Radar, Sparkles } from "lucide-react";
import { faPct, faPrice } from "@/lib/format";

interface ScanResult {
  insCode: string;
  symbol: string;
  name: string;
  price: number;
  lastPct: number;
  score: number;
  reasons: string[];
  fundVerdict: "خرید" | "هولد" | "فروش" | null;
  fundScore: number | null;
}

interface ScanData {
  results: ScanResult[];
  aiNote: string | null;
  scannedCount: number;
  updatedAt: number;
}

export function MarketScanner() {
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scanner");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error === "NO_KEY" ? "NO_KEY" : "خطا در اسکن");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aiParsed = data?.aiNote ? (JSON.parse(data.aiNote) as { note: string; picks: { symbol: string; why: string }[] }) : null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <Radar className="h-4 w-4 text-brand" /> رادار بازار
          <span className="text-[10px] font-normal text-muted">— اسکن ماشینی سهم‌های پرحجم</span>
        </h2>
        <button
          onClick={scan}
          disabled={loading}
          className="ms-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[10px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          اسکن مجدد
        </button>
      </div>

      {loading && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/30" />
            <Radar className="h-7 w-7 text-brand" />
          </div>
          <p className="text-xs text-muted">در حال اسکن ~۸۰ سهم پرحجم بازار… (حدود ۲۰-۴۰ ثانیه)</p>
        </div>
      )}

      {error && error !== "NO_KEY" && (
        <div className="card p-5 text-center text-xs text-down">{error}</div>
      )}
      {error === "NO_KEY" && (
        <div className="card p-5 text-center text-xs text-muted">برای رادار بازار، کلید AvalAI لازم است</div>
      )}

      {data && !loading && (
        <>
          {aiParsed && (
            <div className="mb-3 rounded-2xl border border-brand/25 bg-brand-soft/30 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-brand">
                <Sparkles className="h-3 w-3" /> جمع‌بندی هوش مصنوعی از اسکن
              </div>
              <p className="mt-2 text-[11px] leading-6">{aiParsed.note}</p>
              {aiParsed.picks?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {aiParsed.picks.map((p, i) => (
                    <span key={i} className="rounded-lg border border-up/30 bg-up/10 px-2 py-1 text-[10px] font-bold text-up" title={p.why}>
                      ⭐ {p.symbol} — {p.why}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((r, i) => {
              const conflict = r.fundVerdict === "فروش";
              return (
                <Link
                  key={r.insCode}
                  href={`/stock/${r.insCode}`}
                  className={`card animate-fade-up group relative p-4 transition-all hover:-translate-y-0.5 ${
                    conflict ? "border-down/40 opacity-90" : "hover:border-brand/40"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {conflict && (
                    <span className="absolute -top-2 left-2 rounded-md bg-down px-2 py-0.5 text-[9px] font-black text-white shadow-card">
                      ⚠️ فاندامنتال: فروش
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`num flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black ${conflict ? "bg-down/15 text-down" : "bg-brand-soft text-brand"}`}>
                      {(i + 1).toLocaleString("fa-IR")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-black text-ink group-hover:text-brand">{r.symbol}</span>
                      <div className="truncate text-[9px] text-muted">{r.name}</div>
                    </div>
                    <div className="text-center">
                      <span className="num text-lg font-black text-brand">{r.score.toLocaleString("fa-IR")}</span>
                      <div className="text-[8px] text-muted">تکنیکال</div>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {r.reasons.slice(0, 3).map((rs, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-[10px] leading-4 text-muted">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-up" />
                        {rs}
                      </li>
                    ))}
                  </ul>
                  {r.fundVerdict && (
                    <div className="num mt-2 border-t border-line/50 pt-1.5 text-[9px] font-bold text-muted">
                      فاندامنتال کدال: {r.fundVerdict} {r.fundScore !== null ? `(امتیاز ${r.fundScore.toLocaleString("fa-IR")})` : ""}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[9px] leading-4 text-muted/70">
            اسکن ماشینی {data.scannedCount.toLocaleString("fa-IR")} سهم پرحجم با فرمول قطعی (حجم/مومنتوم/RSI/میانگین/حمایت) — توصیه خرید و فروش نیست
          </p>
        </>
      )}
    </section>
  );
}
