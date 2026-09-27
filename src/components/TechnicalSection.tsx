"use client";

import { useMemo, useState } from "react";
import { BarChart3, Volume2 } from "lucide-react";
import type { Candle, Quote } from "@/types/market";
import { CandleChart, type AiZones } from "./CandleChart";
import { TechnicalAI, type AiResult } from "./TechnicalAI";
import { computeSummary } from "@/lib/indicators";
import { faPct, faPrice } from "@/lib/format";

function Chip({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const cls =
    tone === "up"
      ? "border-up/30 bg-up/5"
      : tone === "down"
        ? "border-down/30 bg-down/5"
        : "border-line bg-surface-2/60";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="text-[10px] text-muted">{label}</div>
      <div className="num mt-0.5 text-sm font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] leading-4 text-muted">{sub}</div>}
    </div>
  );
}

export function TechnicalSection({
  insCode,
  quote,
  dailyCandles,
  onAiResult,
  initialAi = null,
}: {
  insCode: string;
  quote: Quote;
  dailyCandles: Candle[];
  onAiResult?: (ai: AiResult | null) => void;
  initialAi?: AiResult | null;
}) {
  const [ai, setAi] = useState<AiResult | null>(initialAi);

  const summary = useMemo(() => computeSummary(dailyCandles, dailyCandles), [dailyCandles]);
  const levels = useMemo(
    () => ({ supports: summary.supports, resistances: summary.resistances }),
    [summary],
  );
  const zones: AiZones | null = ai
    ? {
        buyZone: ai.plan?.entry ? { min: ai.plan.entry.min, max: ai.plan.entry.max } : null,
        sellZone: null,
        stopLoss: ai.plan?.stopLoss ?? null,
        targets: (ai.plan?.targets ?? []).filter((t) => typeof t === "number"),
        conclusion: ai.conclusion,
      }
    : null;

  const rsi = summary.rsi14;
  const rsiTone = rsi === null ? "neutral" : rsi > 70 ? "down" : rsi < 30 ? "up" : "neutral";
  const rsiLabel = rsi === null ? "—" : rsi > 70 ? "اشباع خرید" : rsi < 30 ? "اشباع فروش" : "متعادل";

  const stoch = summary.stoch;
  const stochTone = stoch === null ? "neutral" : stoch.k > 80 ? "down" : stoch.k < 20 ? "up" : "neutral";
  const stochLabel = stoch === null ? "—" : stoch.k > 80 ? "اشباع خرید" : stoch.k < 20 ? "اشباع فروش" : stoch.k > stoch.d ? "کراس صعودی" : "کراس نزولی";

  const mfiVal = summary.mfi14;
  const mfiTone = mfiVal === null ? "neutral" : mfiVal > 70 ? "down" : mfiVal < 30 ? "up" : "neutral";
  const mfiLabel = mfiVal === null ? "—" : mfiVal > 70 ? "ورود پول شدید" : mfiVal < 30 ? "خروج پول" : "جریان نرمال";

  const macdTone = summary.macdHist === null ? "neutral" : summary.macdHist >= 0 ? "up" : "down";
  const macdLabel =
    summary.macdHist === null ? "—" : summary.macdHist >= 0 ? "مومنتوم مثبت" : "مومنتوم منفی";

  const maTone = summary.maState === "bull" ? "up" : summary.maState === "bear" ? "down" : "neutral";
  const maLabel =
    summary.maState === "bull" ? "میانگین‌ها صعودی" : summary.maState === "bear" ? "میانگین‌ها نزولی" : "خنثی";

  const volTone = summary.volRatio === null ? "neutral" : summary.volRatio >= 1.3 ? "up" : summary.volRatio < 0.7 ? "down" : "neutral";
  const volLabel =
    summary.volRatio === null ? "—" : `${summary.volRatio.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}× میانگین`;

  const bbPos = summary.bbPosition;
  const bbLabel =
    bbPos === null ? "—" : bbPos > 0.85 ? "نزدیک باند بالا" : bbPos < 0.15 ? "نزدیک باند پایین" : "محدوده میانی";
  const bbTone = bbPos === null ? "neutral" : bbPos > 0.85 ? "up" : bbPos < 0.15 ? "down" : "neutral";

  return (
    <div className="space-y-5">
      {/* چارت */}
      <div className="card animate-fade-up p-4 sm:p-5">
        <CandleChart
          insCode={insCode}
          symbol={quote.symbol}
          dailyCandles={dailyCandles}
          levels={levels}
          fib={summary.fib ? { l382: summary.fib.l382, l5: summary.fib.l5, l618: summary.fib.l618, up: summary.fib.up } : null}
          zones={zones}
        />
      </div>

      {/* اندیکاتورها */}
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <BarChart3 className="h-4 w-4 text-brand" /> خلاصه اندیکاتورها
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Chip label="RSI (۱۴)" value={rsi === null ? "—" : rsi.toFixed(0)} sub={rsiLabel} tone={rsiTone} />
          <Chip label="استوکاستیک" value={stoch ? `%K ${stoch.k}` : "—"} sub={stochLabel} tone={stochTone} />
          <Chip label="MFI (جریان پول)" value={mfiVal === null ? "—" : mfiVal.toFixed(0)} sub={mfiLabel} tone={mfiTone} />
          <Chip label="MACD" value={macdLabel} sub="هیستوگرام" tone={macdTone} />
          <Chip label="میانگین ۲۰/۵۰" value={maLabel} sub={`۲۰: ${summary.ma20 ? faPrice(summary.ma20) : "—"} · ۵۰: ${summary.ma50 ? faPrice(summary.ma50) : "—"}`} tone={maTone} />
          <Chip label="باند بولینگر" value={bbLabel} sub={summary.bb ? `${faPrice(summary.bb.lower)} — ${faPrice(summary.bb.upper)}` : undefined} tone={bbTone} />
          <Chip
            label="ATR (نوسان روزانه)"
            value={summary.atrPct !== null ? `${summary.atrPct.toLocaleString("fa-IR")}٪` : "—"}
            sub={summary.atr14 !== null ? `حدود ${faPrice(summary.atr14)} ریال` : undefined}
            tone="neutral"
          />
          <Chip label="حجم امروز" value={volLabel} tone={volTone} />
          <Chip
            label="فیبوناچی طلایی"
            value={summary.fib ? `${faPrice(summary.fib.l618)} — ${faPrice(summary.fib.l382)}` : "—"}
            sub={summary.fib ? (summary.fib.up ? "حرکت صعودی — محدوده برگشت" : "حرکت نزولی — محدوده برگشت") : undefined}
            tone="neutral"
          />
          <Chip
            label="عملکرد"
            value={`${summary.monthPct !== null ? faPct(summary.monthPct) : "—"} ماهانه`}
            sub={`فصلی: ${summary.quarterPct !== null ? faPct(summary.quarterPct) : "—"}`}
            tone={(summary.monthPct ?? 0) >= 0 ? "up" : "down"}
          />
        </div>
      </div>

      {/* تحلیل AI */}
      <TechnicalAI
        insCode={insCode}
        initialAi={ai}
        onResult={(result) => {
          setAi(result);
          onAiResult?.(result);
        }}
      />

      <div className="flex items-center gap-2 text-[10px] text-muted/70">
        <Volume2 className="h-3.5 w-3.5" />
        خطوط سبز = حمایت و ناحیه خرید · خطوط قرمز = مقاومت، ناحیه فروش و حد ضرر
      </div>
    </div>
  );
}
