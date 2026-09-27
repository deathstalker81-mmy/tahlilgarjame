"use client";

import { faPrice } from "@/lib/format";

/** نوار محدوده: کف تا سقف + نشانگر قیمت + خط مرجع (دیروز) */
export function RangeBar({
  low,
  high,
  value,
  lowLabel = "کف",
  highLabel = "سقف",
  valueLabel,
  secondValue,
  secondLabel,
  thirdValue,
  thirdLabel,
  tone = "brand",
  legend = true,
}: {
  low: number;
  high: number;
  value: number;
  lowLabel?: string;
  highLabel?: string;
  valueLabel?: string;
  secondValue?: number;
  secondLabel?: string;
  thirdValue?: number;
  thirdLabel?: string;
  tone?: "brand" | "gold";
  legend?: boolean;
}) {
  if (!low || !high || high <= low) return null;
  const pos = Math.min(Math.max(((value - low) / (high - low)) * 100, 3), 97);
  const pos2 =
    secondValue !== undefined && secondValue
      ? Math.min(Math.max(((secondValue - low) / (high - low)) * 100, 3), 97)
      : null;
  const pos3 =
    thirdValue !== undefined && thirdValue
      ? Math.min(Math.max(((thirdValue - low) / (high - low)) * 100, 3), 97)
      : null;

  return (
    <div dir="ltr" className="w-full select-none">
      <div className="relative h-20">
        {/* برچسب قیمت روی نشانگر */}
        <div
          className={`num absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-black text-white ${
            tone === "gold" ? "bg-gold" : "bg-brand"
          }`}
          style={{ left: `${pos}%` }}
        >
          {valueLabel ?? faPrice(value)}
        </div>

        {/* نوار گرادیانی */}
        <div
          className="absolute top-7 h-4 w-full rounded-full border border-black/5 shadow-inner dark:border-white/10"
          style={{
            background:
              "linear-gradient(90deg, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.3) 28%, rgba(245,158,11,0.3) 50%, rgba(34,197,94,0.3) 72%, rgba(34,197,94,0.8) 100%)",
          }}
        />

        {/* خط مرجع (دیروز) — خط‌چین + برچسب کوچک روی خودش */}
        {pos3 !== null && (
          <>
            <div
              className="absolute top-5 h-6 w-0.5 -translate-x-1/2 rounded bg-gold"
              style={{ left: `${pos3}%` }}
              title={thirdLabel}
            />
            {thirdLabel && thirdValue !== undefined && (
              <div
                className="num absolute top-[46px] z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gold/90 px-1.5 py-0.5 text-[9px] font-black text-white"
                style={{ left: `${pos3}%` }}
              >
                دیروز {faPrice(thirdValue)}
              </div>
            )}
          </>
        )}

        {/* نشانگر اصلی (دایره بزرگ) */}
        <div
          className={`absolute top-[22px] z-10 h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[4px] bg-white shadow-glass dark:bg-slate-900 ${
            tone === "gold" ? "border-gold" : "border-brand"
          }`}
          style={{ left: `${pos}%` }}
        />

        {/* برچسب کف و سقف با مقدار */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between text-[11px]">
          <span className="text-center">
            <span className="block font-bold text-down">{lowLabel}</span>
            <span className="num block font-bold text-ink">{faPrice(low)}</span>
          </span>
          <span className="text-center">
            <span className="block font-bold text-up">{highLabel}</span>
            <span className="num block font-bold text-ink">{faPrice(high)}</span>
          </span>
        </div>
      </div>

      {legend && (
        <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted" dir="rtl">
          <span className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${tone === "gold" ? "bg-gold" : "bg-brand"}`} />
            {valueLabel ?? "قیمت لحظه‌ای"}
          </span>
          {pos3 !== null && thirdLabel && (
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded bg-muted" />
              {thirdLabel}
            </span>
          )}
          {pos2 !== null && secondLabel && (
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold" />
              {secondLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
