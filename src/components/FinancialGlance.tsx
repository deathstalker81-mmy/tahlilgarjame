"use client";

import { Eye } from "lucide-react";
import { faInt, faPct, faPrice } from "@/lib/format";

export interface Snapshot {
  yearLabel: string;
  sales: number;
  netProfit: number;
  netProfitPrior: number | null;
  grossProfit: number;
  operatingProfit: number | null;
  equity: number;
  debt: number;
  grossMargin: number;
  operatingMargin: number | null;
  netMargin: number;
  roe: number;
  debtToEquity: number;
  profitYoy: number | null;
  epsCurrent: number | null;
  epsPrior: number | null;
  salesTrend: { year: string; sales: number; margin: number | null }[];
  epsTrend: { year: string; eps: number }[];
}

/** داوری کیفیت هر نسبت */
function judge(kind: string, v: number): { text: string; cls: string } {
  if (kind === "roe") {
    if (v >= 20) return { text: "عالی — بازدهی قوی برای صاحبان سهام", cls: "bg-up/15 text-up" };
    if (v >= 10) return { text: "قابل قبول", cls: "bg-gold/15 text-gold" };
    return { text: "ضعیف — بازدهی کم", cls: "bg-down/15 text-down" };
  }
  if (kind === "de") {
    if (v <= 1) return { text: "سالم — بدهی کنترل‌شده", cls: "bg-up/15 text-up" };
    if (v <= 2) return { text: "متوسط — مراقب باش", cls: "bg-gold/15 text-gold" };
    return { text: "پرریسک — بدهی سنگین", cls: "bg-down/15 text-down" };
  }
  if (kind === "margin") {
    if (v >= 25) return { text: "قوی", cls: "bg-up/15 text-up" };
    if (v >= 10) return { text: "متوسط", cls: "bg-gold/15 text-gold" };
    return { text: "نازک", cls: "bg-down/15 text-down" };
  }
  return { text: "", cls: "" };
}

function Tile({ label, value, sub, judgment }: { label: string; value: string; sub?: string; judgment?: { text: string; cls: string } }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="num mt-1 text-2xl font-black text-ink">{value}</div>
      {sub && <div className="num mt-0.5 text-[9px] text-muted">{sub}</div>}
      {judgment && <div className={`num mt-2 rounded-lg px-2 py-1 text-[10px] font-bold ${judgment.cls}`}>{judgment.text}</div>}
    </div>
  );
}

export function FinancialGlance({ snapshot, loading: loadingProp }: { snapshot: Snapshot | null; loading?: boolean }) {
  const snap = snapshot;
  const loading = loadingProp ?? false;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Eye className="h-4 w-4 text-brand" />
        <span className="text-xs font-bold text-muted">در یک نگاه مالی</span>
        {snap?.yearLabel && (
          <span className="num rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted">
            سال مالی منتهی به {snap.yearLabel}
          </span>
        )}
        <span className="ms-auto rounded-md bg-brand-soft px-1.5 py-0.5 text-[9px] font-bold text-brand">
          از صورت‌های مالی حسابرسی‌شده کدال — محاسبه قطعی
        </span>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : !snap ? (
        <p className="mt-4 text-center text-[11px] text-muted">صورت‌های مالی قابل استخراج نبود</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tile
              label="بازده حقوق صاحبان سهام (ROE)"
              value={`${faPrice(snap.roe)}٪`}
              sub={`سود خالص ÷ حقوق صاحبان سهام`}
              judgment={judge("roe", snap.roe)}
            />
            <Tile
              label="بدهی ÷ حقوق صاحبان سهام"
              value={faPrice(snap.debtToEquity)}
              sub={`بدهی ${faPrice(snap.debt)} / حقوق ${faPrice(snap.equity)}`}
              judgment={judge("de", snap.debtToEquity)}
            />
            <Tile
              label="حاشیه سود ناخالص"
              value={`${faPrice(snap.grossMargin)}٪`}
              sub="سود ناخالص ÷ فروش"
              judgment={judge("margin", snap.grossMargin)}
            />
            <Tile
              label="حاشیه سود عملیاتی"
              value={snap.operatingMargin !== null ? `${faPrice(snap.operatingMargin)}٪` : "—"}
              sub="سود عملیاتی ÷ فروش"
              judgment={snap.operatingMargin !== null ? judge("margin", snap.operatingMargin) : undefined}
            />
            <Tile
              label="حاشیه سود خالص"
              value={`${faPrice(snap.netMargin)}٪`}
              sub="سود خالص ÷ فروش"
              judgment={judge("margin", snap.netMargin)}
            />
            <Tile
              label="رشد سود خالص سالانه"
              value={snap.profitYoy !== null ? faPct(snap.profitYoy) : "—"}
              sub={`سود امسال: ${faPrice(snap.netProfit)}`}
            />
          </div>

          {/* روند ۶ ساله فروش + حاشیه */}
          {snap.salesTrend && snap.salesTrend.length > 2 && (
            <div className="mt-4 rounded-2xl border border-line/70 bg-surface-2/40 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-muted">روند فروش سالانه (هزار میلیارد تومان) + حاشیه ناخالص</span>
                <span className="num text-[9px] text-muted/70">آخرین ستون: برآورد شرکت</span>
              </div>
              <div className="flex items-end gap-2" dir="rtl">
                {snap.salesTrend.map((t) => {
                  const maxS = Math.max(...snap.salesTrend.map((x) => x.sales), 1);
                  const h = Math.max((t.sales / maxS) * 90, 8);
                  return (
                    <div key={t.year} className="flex flex-1 flex-col items-center justify-end">
                      <span className="num text-[9px] font-bold text-ink">{Math.round(t.sales / 10).toLocaleString("fa-IR")}</span>
                      <div
                        className={`mt-1 w-full rounded-t-md ${t.margin !== null && t.margin < 25 ? "bg-gold/60" : "bg-brand/70"}`}
                        style={{ height: `${h}px` }}
                        title={`حاشیه: ${t.margin}٪`}
                      />
                      <span className="num mt-1 text-[9px] text-muted">{t.year}</span>
                      {t.margin !== null && <span className="num text-[8px] text-muted/70">{faPrice(t.margin)}٪</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* روند EPS چندساله */}
          {snap.epsTrend.length > 1 && (
            <div className="mt-4 rounded-2xl border border-line/70 bg-surface-2/40 p-4">
              <div className="mb-2 text-[10px] font-semibold text-muted">روند EPS (سود هر سهم) — سالانه</div>
              <div className="flex items-end gap-2" dir="rtl">
                {snap.epsTrend.map((e, i) => {
                  const maxE = Math.max(...snap.epsTrend.map((x) => x.eps), 1);
                  const prev = i > 0 ? snap.epsTrend[i - 1].eps : null;
                  const up = prev !== null ? e.eps >= prev : true;
                  return (
                    <div key={e.year} className="flex flex-1 flex-col items-center justify-end">
                      <span className="num text-[10px] font-bold">{faPrice(e.eps)}</span>
                      <div
                        className={`mt-1 w-full rounded-t-md ${up ? "bg-up/60" : "bg-down/60"}`}
                        style={{ height: `${Math.max((e.eps / maxE) * 60, 6)}px` }}
                      />
                      <span className="num mt-1 text-[9px] text-muted">{e.year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
