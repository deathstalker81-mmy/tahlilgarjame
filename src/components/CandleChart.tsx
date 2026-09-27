"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Maximize2 } from "lucide-react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type LineData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/types/market";
import { toWeekly, rsi as rsiCalc } from "@/lib/indicators";

export interface AiZones {
  buyZone: { min: number; max: number } | null;
  sellZone: { min: number; max: number } | null;
  stopLoss: number | null;
  targets: number[];
  conclusion: string;
}

export interface FibLevels {
  l382: number;
  l5: number;
  l618: number;
  up: boolean;
}

type Timeframe = "daily" | "weekly" | "live";

const palettes = {
  dark: { text: "#8A94A8", grid: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)" },
  light: { text: "#64748B", grid: "rgba(15,23,42,0.06)", border: "rgba(15,23,42,0.08)" },
};

const toDash = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

function intradayTime(date: number, time: string): UTCTimestamp {
  const y = Math.floor(date / 10000);
  const m = Math.floor(date / 100) % 100;
  const d = date % 100;
  const [hh, mm, ss] = time.split(":").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, hh, mm, ss) / 1000) as UTCTimestamp;
}

interface Props {
  insCode: string;
  symbol: string;
  dailyCandles: Candle[];
  levels: { supports: number[]; resistances: number[] };
  fib?: FibLevels | null;
  zones?: AiZones | null;
}

function timeToDate(time: Time): Date {
  try {
    if (typeof time === "object" && time !== null && "year" in time) {
      const bd = time as { year: number; month: number; day: number };
      return new Date(Date.UTC(bd.year, bd.month - 1, bd.day));
    }
    if (typeof time === "number") return new Date(time * 1000);
    if (typeof time === "string") {
      const p = time.split("-").map(Number);
      if (p.length === 3 && p.every((n) => !Number.isNaN(n))) return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    }
    return new Date(NaN);
  } catch {
    return new Date(NaN);
  }
}

function faTick(time: Time, live: boolean): string {
  try {
    const d = timeToDate(time);
    if (Number.isNaN(d.getTime())) return "";
    if (live) {
      return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d);
    }
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
  } catch {
    return "";
  }
}

function faCrosshair(time: Time, live: boolean): string {
  try {
    const d = timeToDate(time);
    if (Number.isNaN(d.getTime())) return "";
    if (live) {
      return new Intl.DateTimeFormat("fa-IR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(d);
    }
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  } catch {
    return "";
  }
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function CandleChart({ insCode, symbol, dailyCandles, levels, fib, zones }: Props) {
  const { resolvedTheme } = useTheme();
  const [tf, setTf] = useState<Timeframe>("daily");
  const [legend, setLegend] = useState<string | null>(null);

  const [layers, setLayers] = useState({
    ma: true,
    volume: true,
    sr: true,
    fib: false,
    ai: true,
    rsi: true,
  });
  const toggleLayer = (key: keyof typeof layers) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const rsiRef = useRef<ISeriesApi<"Line"> | null>(null);
  const maRefs = useRef<ISeriesApi<"Line">[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const [liveData, setLiveData] = useState<{ date: number; isToday: boolean; points: { time: string; price: number }[] } | null>(null);
  const lastSigRef = useRef<string>("");
  const fittedTfRef = useRef<string>("");
  const fittedLiveRef = useRef<string>("");

  /* ساخت چارت (یک‌بار) — همه در یک بوم: کندل + حجم (نوار پایین) + RSI (نوار پایین‌تر) */
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    try {
      const chart = createChart(el, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: palettes.dark.text,
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          attributionLogo: false,
        },
        grid: { vertLines: { color: palettes.dark.grid }, horzLines: { color: palettes.dark.grid } },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: palettes.dark.border },
        timeScale: { borderColor: palettes.dark.border, timeVisible: false },
      });
      chartRef.current = chart;

      candleRef.current = chart.addCandlestickSeries({
        upColor: "#22C55E",
        downColor: "#EF4444",
        wickUpColor: "#22C55E",
        wickDownColor: "#EF4444",
        borderVisible: false,
      });
      lineRef.current = chart.addLineSeries({
        color: "#6366F1",
        lineWidth: 2,
        visible: false,
        priceLineVisible: false,
      });
      volRef.current = chart.addHistogramSeries({
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
      });
      chart
        .priceScale("vol")
        .applyOptions({ scaleMargins: { top: 0.88, bottom: 0 }, visible: false });

      /* RSI به صورت اورلی در نوار پایین چارت (مقیاس مخفی ۰-۱۰۰) */
      rsiRef.current = chart.addLineSeries({
        color: "#8B5CF6",
        lineWidth: 2,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      chart.priceScale("rsi").applyOptions({ visible: false, scaleMargins: { top: 0.74, bottom: 0.14 } });
      rsiRef.current.createPriceLine({ price: 70, color: "rgba(239,68,68,0.35)", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "", axisLabelVisible: false });
      rsiRef.current.createPriceLine({ price: 30, color: "rgba(34,197,94,0.35)", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "", axisLabelVisible: false });

      for (const color of ["#F59E0B", "#8B5CF6"]) {
        const s = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        maRefs.current.push(s);
      }

      chart.subscribeCrosshairMove((p) => {
        try {
          const candleSeries = candleRef.current;
          if (!p.time || !candleSeries) {
            setLegend(null);
            return;
          }
          const cd = p.seriesData.get(candleSeries) as CandlestickData<Time> | undefined;
          if (cd) {
            const sign = cd.close >= cd.open ? "+" : "−";
            const pctv = cd.open ? Math.abs(((cd.close - cd.open) / cd.open) * 100).toFixed(2) : "0";
            setLegend(
              `${sign}${pctv}٪  |  باز ${cd.open.toLocaleString("fa-IR")}  ·  بالا ${cd.high.toLocaleString("fa-IR")}  ·  پایین ${cd.low.toLocaleString("fa-IR")}  ·  بسته ${cd.close.toLocaleString("fa-IR")}`,
            );
          }
        } catch {
          /* ignore */
        }
      });

      return () => {
        chart.remove();
        chartRef.current = null;
        candleRef.current = null;
        lineRef.current = null;
        volRef.current = null;
        rsiRef.current = null;
        maRefs.current = [];
        priceLinesRef.current = [];
      };
    } catch (err) {
      console.error("[chart] init failed:", err);
    }
  }, []);

  /* هماهنگی تم */
  useEffect(() => {
    const p = palettes[resolvedTheme === "light" ? "light" : "dark"];
    chartRef.current?.applyOptions({
      layout: { textColor: p.text },
      grid: { vertLines: { color: p.grid }, horzLines: { color: p.grid } },
      rightPriceScale: { borderColor: p.border },
      timeScale: { borderColor: p.border },
    });
  }, [resolvedTheme]);

  /* تاریخ شمسی روی محور و کراسهیر */
  useEffect(() => {
    const live = tf === "live";
    chartRef.current?.applyOptions({
      timeScale: { tickMarkFormatter: (t: Time) => faTick(t, live) },
      localization: { timeFormatter: (t: Time) => faCrosshair(t, live) },
    });
  }, [tf]);

  /* لایه‌ها */
  useEffect(() => {
    maRefs.current.forEach((s) => s?.applyOptions({ visible: layers.ma }));
  }, [layers.ma]);
  useEffect(() => {
    volRef.current?.applyOptions({ visible: layers.volume });
  }, [layers.volume]);
  useEffect(() => {
    rsiRef.current?.applyOptions({ visible: layers.rsi });
  }, [layers.rsi]);

  /* داده روزانه/هفتگی — بدون به‌هم‌زدن زوم کاربر */
  useEffect(() => {
    if (tf === "live" || !candleRef.current || !volRef.current || dailyCandles.length === 0) return;
    const lastC = dailyCandles[dailyCandles.length - 1];
    const sig = `${tf}-${dailyCandles.length}-${lastC?.date}-${lastC?.close}-${lastC?.volume}`;
    const isFirstFit = fittedTfRef.current !== tf;
    if (sig === lastSigRef.current && !isFirstFit) return;
    lastSigRef.current = sig;
    fittedTfRef.current = tf;

    const data = tf === "weekly" ? toWeekly(dailyCandles) : dailyCandles;
    const clean = data.filter((c) => finite(c.open) && finite(c.high) && finite(c.low) && finite(c.close) && finite(c.volume));
    candleRef.current.setData(
      clean.map((c) => ({ time: toDash(c.date) as Time, open: c.open, high: c.high, low: c.low, close: c.close })),
    );
    volRef.current.setData(
      clean.map((c) => ({
        time: toDash(c.date) as Time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
      })),
    );
    const closes = clean.map((c) => c.close);
    const ma = (period: number) => {
      const out: LineData<Time>[] = [];
      let sum = 0;
      for (let i = 0; i < closes.length; i++) {
        sum += closes[i];
        if (i >= period) sum -= closes[i - period];
        if (i >= period - 1) out.push({ time: toDash(clean[i].date) as Time, value: sum / period });
      }
      return out;
    };
    maRefs.current[0]?.setData(ma(20));
    maRefs.current[1]?.setData(ma(50));

    /* RSI روی مقیاس خودش */
    const rsiArr = rsiCalc(closes);
    rsiRef.current?.setData(
      rsiArr
        .map((v, i) => (finite(v) ? { time: toDash(clean[i].date) as Time, value: v } : null))
        .filter((x): x is { time: Time; value: number } => x !== null),
    );

    /* فیت فقط بار اول هر تایم‌فریم */
    if (isFirstFit) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [tf, dailyCandles]);

  /* داده لحظه‌ای */
  useEffect(() => {
    if (tf !== "live") return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/intraday`);
        const json = await res.json();
        if (alive && json.ok) setLiveData(json.data);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [tf, insCode]);

  useEffect(() => {
    if (tf !== "live" || !lineRef.current || !candleRef.current || !liveData) return;
    candleRef.current.applyOptions({ visible: false });
    volRef.current?.applyOptions({ visible: false });
    lineRef.current.applyOptions({ visible: true });
    lineRef.current.setData(
      liveData.points
        .filter((p) => finite(p.price))
        .map((p) => ({ time: intradayTime(liveData.date, p.time), value: p.price })),
    );
    chartRef.current?.timeScale().applyOptions({ timeVisible: true });
    const liveSig = `${liveData.date}-${liveData.points.length}`;
    if (fittedLiveRef.current !== liveSig) {
      fittedLiveRef.current = liveSig;
      chartRef.current?.timeScale().fitContent();
    }
    return () => {
      lineRef.current?.applyOptions({ visible: false });
      candleRef.current?.applyOptions({ visible: true });
      volRef.current?.applyOptions({ visible: layers.volume });
      chartRef.current?.timeScale().applyOptions({ timeVisible: false });
    };
  }, [tf, liveData, layers.volume]);

  /* سطوح حمایت/مقاومت، فیبوناچی و نواحی AI */
  useEffect(() => {
    const series = candleRef.current;
    if (!series || tf !== "daily") return;
    for (const pl of priceLinesRef.current) {
      try {
        series.removePriceLine(pl);
      } catch {
        /* ignore */
      }
    }
    priceLinesRef.current = [];
    const add = (price: number, color: string, title: string, style: LineStyle) => {
      if (!finite(price) || price <= 0) return;
      try {
        priceLinesRef.current.push(
          series.createPriceLine({ price, color, lineWidth: 1, lineStyle: style, title, axisLabelVisible: false }),
        );
      } catch {
        /* ignore */
      }
    };
    if (layers.sr) {
      for (const l of levels.supports.slice(0, 2)) add(l, "rgba(34,197,94,0.32)", "حمایت", LineStyle.Dashed);
      for (const l of levels.resistances.slice(0, 2)) add(l, "rgba(239,68,68,0.32)", "مقاومت", LineStyle.Dashed);
    }
    if (layers.fib && fib) {
      add(fib.l382, "rgba(245,158,11,0.35)", "فیبو ۰.۳۸۲", LineStyle.Dotted);
      add(fib.l5, "rgba(245,158,11,0.5)", "فیبو ۰.۵", LineStyle.Dashed);
      add(fib.l618, "rgba(245,158,11,0.7)", "فیبو ۰.۶۱۸", LineStyle.Solid);
    }
    if (layers.ai && zones?.buyZone) {
      add(zones.buyZone.min, "rgba(34,197,94,0.9)", "کف ناحیه خرید", LineStyle.Solid);
      add(zones.buyZone.max, "rgba(34,197,94,0.45)", "سقف ناحیه خرید", LineStyle.Dotted);
    }
    if (layers.ai && zones?.sellZone) {
      add(zones.sellZone.min, "rgba(239,68,68,0.45)", "کف ناحیه فروش", LineStyle.Dotted);
      add(zones.sellZone.max, "rgba(239,68,68,0.9)", "سقف ناحیه فروش", LineStyle.Solid);
    }
    if (layers.ai && zones?.targets) {
      zones.targets.filter((t) => finite(t) && t > 0).slice(0, 2).forEach((t, i) => {
        add(t, "rgba(34,197,94,0.7)", `هدف ${i + 1 === 1 ? "۱" : "۲"}`, LineStyle.Dashed);
      });
    }
    if (layers.ai && zones?.stopLoss) add(zones.stopLoss, "#EF4444", "حد ضرر", LineStyle.LargeDashed);
  }, [levels, zones, fib, tf, dailyCandles, layers.sr, layers.fib, layers.ai]);

  const tfs: { key: Timeframe; label: string }[] = [
    { key: "live", label: "لحظه‌ای" },
    { key: "daily", label: "روزانه" },
    { key: "weekly", label: "هفتگی" },
  ];

  const layerDefs: { key: keyof typeof layers; label: string; dot: string }[] = [
    { key: "ma", label: "میانگین‌ها", dot: "#F59E0B" },
    { key: "volume", label: "حجم", dot: "#94A3B8" },
    { key: "sr", label: "حمایت/مقاومت", dot: "#22C55E" },
    { key: "fib", label: "فیبوناچی", dot: "#F59E0B" },
    { key: "ai", label: "نواحی AI", dot: "#6366F1" },
    { key: "rsi", label: "RSI", dot: "#8B5CF6" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {tfs.map((t) => {
            const isLiveLabel = t.key !== "live" || !liveData || liveData.isToday;
            const label = t.key === "live" ? (isLiveLabel ? "لحظه‌ای" : "آخرین جلسه") : t.label;
            const showPulse = t.key === "live" && (!liveData || liveData.isToday);
            return (
              <button
                key={t.key}
                onClick={() => setTf(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  tf === t.key ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {label}
                {showPulse && (
                  <span className="relative ms-1.5 inline-flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => chartRef.current?.timeScale().fitContent()}
            title="بازنشانی زوم"
            aria-label="بازنشانی زوم"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-line text-muted transition-colors hover:text-brand"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <div className="num text-[11px] text-muted">{legend ?? symbol}</div>
        </div>
      </div>

      {tf !== "live" && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5" dir="rtl">
          <span className="text-[9px] text-muted/70">لایه‌ها:</span>
          {layerDefs.map((d) => (
            <button
              key={d.key}
              onClick={() => toggleLayer(d.key)}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                layers[d.key] ? "border-brand/40 bg-brand-soft text-brand" : "border-line text-muted/50"
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: layers[d.key] ? d.dot : "currentColor", opacity: layers[d.key] ? 1 : 0.4 }}
              />
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative" dir="ltr">
        {(() => {
          const lastC = dailyCandles[dailyCandles.length - 1];
          const prevC = dailyCandles[dailyCandles.length - 2];
          if (!lastC) return null;
          const livePrice = tf === "live" && liveData && liveData.points.length > 0 ? liveData.points[liveData.points.length - 1].price : null;
          const price = livePrice ?? lastC.close;
          const pct = prevC && prevC.close ? ((price - prevC.close) / prevC.close) * 100 : 0;
          const positive = pct >= 0;
          return (
            <div
              className={`num pointer-events-none absolute left-2 top-2 z-20 rounded-lg border px-2.5 py-1 text-sm font-black backdrop-blur ${
                positive ? "border-up/40 bg-up/80 text-white" : "border-down/40 bg-down/80 text-white"
              }`}
              dir="rtl"
            >
              قیمت الان: {price.toLocaleString("fa-IR")}
              <span className="ms-1.5 font-bold opacity-95">
                {"\u2066"}
                {positive ? "+" : "−"}
                {"\u200E"}
                {Math.abs(Math.round(pct * 100) / 100).toLocaleString("fa-IR")}
                {"\u2069"}٪
              </span>
            </div>
          );
        })()}
        <div ref={elRef} className="h-[420px] w-full" />
      </div>

      {tf === "daily" && (
        <div className="num mt-1 flex items-center justify-center gap-4 text-[9px] text-muted/70" dir="rtl">
          <span className="flex items-center gap-1">
            <span className="h-2 w-1 rounded-sm bg-violet-500" /> RSI در نوار پایین چارت (مقیاس ۰-۱۰۰)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-muted/50" /> حجم معاملات
          </span>
        </div>
      )}
    </div>
  );
}
