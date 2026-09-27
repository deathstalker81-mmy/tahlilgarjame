import type { Candle } from "@/types/market";

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** RSI وایلدر */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = values[i] - values[i - 1];
    gain += Math.max(ch, 0);
    loss += Math.max(-ch, 0);
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(ch, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-ch, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number | null; signal: number | null; hist: number | null } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  const valid = macdLine.filter((v): v is number => v !== null);
  if (valid.length < signalPeriod) return { macd: null, signal: null, hist: null };
  const sigArr = ema(valid, signalPeriod);
  const lastMacd = valid[valid.length - 1];
  const lastSig = sigArr[sigArr.length - 1];
  if (lastSig === null) return { macd: lastMacd, signal: null, hist: null };
  return { macd: lastMacd, signal: lastSig, hist: lastMacd - lastSig };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  if (values.length < period) return null;
  const tail = values.slice(-period);
  const mid = tail.reduce((a, b) => a + b, 0) / period;
  const variance = tail.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { mid, upper: mid + mult * sd, lower: mid - mult * sd };
}

/** نقاط سوئینگ (سقف/کف محلی) */
export interface SwingPoint {
  index: number;
  price: number;
  type: "high" | "low";
}

export function findSwings(candles: Candle[], w = 4): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = w; i < candles.length - w; i++) {
    const seg = candles.slice(i - w, i + w + 1);
    if (candles[i].high >= Math.max(...seg.map((c) => c.high))) swings.push({ index: i, price: candles[i].high, type: "high" });
    else if (candles[i].low <= Math.min(...seg.map((c) => c.low))) swings.push({ index: i, price: candles[i].low, type: "low" });
  }
  return swings;
}

/** الگوهای کلاسیک بازگشتی/ادامه‌دهنده — تشخیص قطعی از روی سوئینگ‌ها */
export function detectChartPatterns(candles: Candle[]): string[] {
  const out: string[] = [];
  const seg = candles.slice(-90);
  if (seg.length < 30) return out;
  const swings = findSwings(seg, 4);
  const highs = swings.filter((s) => s.type === "high").slice(-3);
  const lows = swings.filter((s) => s.type === "low").slice(-3);

  if (highs.length >= 2) {
    const [h1, h2] = highs.slice(-2);
    if (Math.abs(h1.price - h2.price) / h2.price < 0.02 && h2.index - h1.index >= 5) {
      out.push("الگوی سقف دوقلو — دو سقف هم‌سطح (هشدار بازگشت نزولی)");
    }
  }
  if (lows.length >= 2) {
    const [l1, l2] = lows.slice(-2);
    if (Math.abs(l1.price - l2.price) / l2.price < 0.02 && l2.index - l1.index >= 5) {
      out.push("الگوی کف دوقلو — دو کف هم‌سطح (پتانسیل بازگشت صعودی)");
    }
  }
  if (highs.length >= 2 && lows.length >= 2) {
    const hDown = highs[highs.length - 1].price < highs[highs.length - 2].price;
    const lUp = lows[lows.length - 1].price > lows[lows.length - 2].price;
    if (hDown && lUp) out.push("مثلث متقارن — همگرایی سقف‌ها و کف‌ها (انتظار حرکت انفجاری)");
    else if (hDown && !lUp) out.push("مثلث نزولی — سقف‌های نزولی با کف‌های افقی");
    else if (!hDown && lUp) out.push("مثلث صعودی — کف‌های صعودی با سقف‌های افقی");
  }
  return out;
}

/** واگرایی MACD روی سوئینگ‌های قیمت */
export function detectDivergence(candles: Candle[]): string[] {
  const out: string[] = [];
  const closes = candles.map((c) => c.close);
  const { macd } = macdSeries(closes);
  const swings = findSwings(candles, 4);
  const highs = swings.filter((s) => s.type === "high").slice(-2);
  const lows = swings.filter((s) => s.type === "low").slice(-2);

  if (macd && highs.length === 2) {
    const m1 = macd[highs[0].index];
    const m2 = macd[highs[1].index];
    if (m1 !== null && m2 !== null) {
      if (highs[1].price > highs[0].price && m2 < m1) out.push("واگرایی نزولی MACD — قیمت سقف بالاتر زده ولی مومنتوم ضعیف‌تر شده");
      else if (highs[1].price < highs[0].price && m2 > m1) out.push("واگرایی صعودی MACD — قیمت کف پایین‌تر زده ولی مومنتوم قوی‌تر شده");
    }
  }
  if (macd && lows.length === 2) {
    const m1 = macd[lows[0].index];
    const m2 = macd[lows[1].index];
    if (m1 !== null && m2 !== null) {
      if (lows[1].price < lows[0].price && m2 > m1) out.push("واگرایی صعودی MACD روی کف‌ها — قیمت کف پایین‌تر، مومنتوم قوی‌تر");
      else if (lows[1].price > lows[0].price && m2 < m1) out.push("واگرایی نزولی MACD روی کف‌ها — قیمت کف بالاتر، مومنتوم ضعیف‌تر");
    }
  }
  return out;
}

/** تشخیص قطعی و ریاضی الگوها — بدون حدس؛ AI فقط می‌تواند به این واقعیت‌ها استناد کند */
export function detectPatterns(candles: Candle[]): string[] {
  const facts: string[] = [];
  if (candles.length < 5) return facts;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  // گپ
  if (last.open > prev.high * 1.005) facts.push("گپ رو به بالا در آخرین کندل (باز بالاتر از سقف دیروز)");
  if (last.open < prev.low * 0.995) facts.push("گپ رو به پایین در آخرین کندل (باز پایین‌تر از کف دیروز)");

  // انگالفینگ
  if (last.close > last.open && prev.close < prev.open && last.close > prev.open && last.open <= prev.close)
    facts.push("الگوی انگالفینگ صعودی در آخرین کندل");
  if (last.close < last.open && prev.close > prev.open && last.close < prev.open && last.open >= prev.close)
    facts.push("الگوی انگالفینگ نزولی در آخرین کندل");

  // دوجی و پین‌بار
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  if (range > 0 && body / range < 0.1) facts.push("دوجی در آخرین کندل (باز و بسته تقریباً برابر = تردید بازار)");
  const lowerWick = Math.min(last.open, last.close) - last.low;
  const upperWick = last.high - Math.max(last.open, last.close);
  if (range > 0 && lowerWick > body * 2 && upperWick < body) facts.push("پین‌بار (چکش) با سایه پایینی بلند در آخرین کندل");
  if (range > 0 && upperWick > body * 2 && lowerWick < body) facts.push("ستاره ثاقب با سایه بالایی بلند در آخرین کندل");

  // ساختار سقف/کف‌های ۲۰ کندل اخیر
  const seg = candles.slice(-20);
  const firstHalf = seg.slice(0, 10);
  const secondHalf = seg.slice(10);
  const hh = Math.max(...secondHalf.map((c) => c.high)) > Math.max(...firstHalf.map((c) => c.high));
  const hl = Math.min(...secondHalf.map((c) => c.low)) > Math.min(...firstHalf.map((c) => c.low));
  if (hh && hl) facts.push("ساختار سقف‌های بالاتر و کف‌های بالاتر در ۲۰ کندل اخیر (روند صعودی ساختاری)");
  if (!hh && !hl) facts.push("ساختار سقف‌های پایین‌تر و کف‌های پایین‌تر در ۲۰ کندل اخیر (روند نزولی ساختاری)");

  // جهش حجم
  const volAvg = candles.slice(-21, -1).reduce((a, c) => a + c.volume, 0) / 20;
  if (volAvg > 0 && last.volume > volAvg * 2)
    facts.push(`حجم آخرین روز ${Math.round(last.volume / volAvg)} برابر میانگین ۲۰ روزه (ورود/خروج پول سنگین)`);

  // فشردگی بولینگر
  const bbNow = bollinger(candles.map((c) => c.close));
  const bbPrev = bollinger(candles.slice(0, -10).map((c) => c.close));
  if (bbNow && bbPrev) {
    const wNow = bbNow.upper - bbNow.lower;
    const wPrev = bbPrev.upper - bbPrev.lower;
    if (wPrev > 0 && wNow < wPrev * 0.7) facts.push("فشردگی باند بولینگر (باریک‌شدن محدوده نوسان = احتمال حرکت شدید پیش‌رو)");
  }

  return facts;
}
function clusterLevels(levels: number[], tolerance = 0.012): { level: number; n: number }[] {
  const sorted = [...levels].sort((a, b) => a - b);
  const groups: { sum: number; n: number }[] = [];
  for (const v of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(v - g.sum / g.n) / v < tolerance) {
      g.sum += v;
      g.n++;
    } else groups.push({ sum: v, n: 1 });
  }
  return groups.map((g) => ({ level: g.sum / g.n, n: g.n }));
}

export function findLevels(candles: Candle[], price: number): { supports: number[]; resistances: number[] } {
  const w = 5;
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  for (let i = w; i < candles.length - w; i++) {
    const seg = candles.slice(i - w, i + w + 1);
    if (candles[i].high >= Math.max(...seg.map((c) => c.high))) swingHighs.push(candles[i].high);
    if (candles[i].low <= Math.min(...seg.map((c) => c.low))) swingLows.push(candles[i].low);
  }
  const supports = clusterLevels(swingLows.filter((l) => l < price))
    .sort((a, b) => b.level - a.level)
    .slice(0, 4)
    .map((x) => Math.round(x.level));
  const resistances = clusterLevels(swingHighs.filter((h) => h > price))
    .sort((a, b) => a.level - b.level)
    .slice(0, 4)
    .map((x) => Math.round(x.level));
  return { supports, resistances };
}

/** تجمیع روزانه به هفتگی (هفته از شنبه) */
export function toWeekly(candles: Candle[]): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(
      Number(c.date.slice(0, 4)),
      Number(c.date.slice(4, 6)) - 1,
      Number(c.date.slice(6, 8)),
    );
    const offset = (d.getDay() + 1) % 7;
    d.setDate(d.getDate() - offset);
    const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }
  return Array.from(groups.values()).map((g) => ({
    date: g[0].date,
    open: g[0].open,
    high: Math.max(...g.map((c) => c.high)),
    low: Math.min(...g.map((c) => c.low)),
    close: g[g.length - 1].close,
    volume: g.reduce((a, c) => a + c.volume, 0),
  }));
}

/** سری کامل MACD برای رسم نمودار */
export function macdSeries(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  const firstIdx = macdLine.findIndex((v) => v !== null);
  const valid = macdLine.filter((v): v is number => v !== null);
  const sigArr = ema(valid, signalPeriod);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  const hist: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < sigArr.length; i++) {
    const idx = firstIdx + i;
    if (sigArr[i] !== null) {
      signal[idx] = sigArr[i];
      hist[idx] = valid[i] - (sigArr[i] as number);
    }
  }
  return { macd: macdLine, signal, hist };
}

/** استوکاستیک کلاسیک */
export function stochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3,
): { k: number | null; d: number | null } {
  if (candles.length < kPeriod + dPeriod) return { k: null, d: null };
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const seg = candles.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...seg.map((c) => c.high));
    const ll = Math.min(...seg.map((c) => c.low));
    rawK.push(hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
  }
  const k = rawK[rawK.length - 1];
  const dTail = rawK.slice(-dPeriod);
  const d = dTail.reduce((a, b) => a + b, 0) / dTail.length;
  return { k, d };
}

/** شاخص جریان پول (MFI) — نسخه حجمی RSI */
export function mfi(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  let posFlow = 0;
  let negFlow = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const money = tp[i] * candles[i].volume;
    if (tp[i] > tp[i - 1]) posFlow += money;
    else if (tp[i] < tp[i - 1]) negFlow += money;
  }
  if (negFlow === 0) return 100;
  return 100 - 100 / (1 + posFlow / negFlow);
}

/** میانگین دامنه واقعی (ATR) */
export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  let value = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    value = (value * (period - 1) + trs[i]) / period;
  }
  return value;
}

/** سطوح فیبوناچی بازگشتی روی محدوده ۹۰ کندل اخیر */
export function fibonacci(candles: Candle[], lookback = 90) {
  const seg = candles.slice(-lookback);
  if (seg.length < 10) return null;
  const high = Math.max(...seg.map((c) => c.high));
  const low = Math.min(...seg.map((c) => c.low));
  if (high === low) return null;
  const highIdx = seg.findIndex((c) => c.high === high);
  const lowIdx = seg.findIndex((c) => c.low === low);
  const upMove = lowIdx < highIdx; // اول کف، بعد سقف = حرکت صعودی
  const level = (r: number) =>
    Math.round(upMove ? high - (high - low) * r : low + (high - low) * r);
  return {
    up: upMove,
    l236: level(0.236),
    l382: level(0.382),
    l5: level(0.5),
    l618: level(0.618),
    l786: level(0.786),
  };
}

export interface TechSummary {
  lastPrice: number;
  rsi14: number | null;
  ma20: number | null;
  ma50: number | null;
  maState: "bull" | "bear" | "neutral";
  macdHist: number | null;
  bb: { upper: number; mid: number; lower: number } | null;
  bbPosition: number | null;
  stoch: { k: number; d: number } | null;
  mfi14: number | null;
  atr14: number | null;
  atrPct: number | null;
  fib: { up: boolean; l236: number; l382: number; l5: number; l618: number; l786: number } | null;
  volRatio: number | null;
  monthPct: number | null;
  quarterPct: number | null;
  fromYearHighPct: number | null;
  fromYearLowPct: number | null;
  supports: number[];
  resistances: number[];
}

export function computeSummary(candles: Candle[], dailyCandles: Candle[]): TechSummary {
  const closes = dailyCandles.map((c) => c.close);
  const last = closes[closes.length - 1];
  const rsiArr = rsi(closes);
  const ma20Arr = sma(closes, 20);
  const ma50Arr = sma(closes, 50);
  const m = macd(closes);
  const bb = bollinger(closes);
  const vols = dailyCandles.map((c) => c.volume);
  const volAvg = vols.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const pct = (days: number) =>
    closes.length > days ? ((last - closes[closes.length - 1 - days]) / closes[closes.length - 1 - days]) * 100 : null;
  const yearCandles = dailyCandles.slice(-252);
  const yearHigh = yearCandles.length ? Math.max(...yearCandles.map((c) => c.high)) : null;
  const yearLow = yearCandles.length ? Math.min(...yearCandles.map((c) => c.low)) : null;
  const ma20 = ma20Arr[ma20Arr.length - 1];
  const ma50 = ma50Arr[ma50Arr.length - 1];
  const stochK = stochastic(dailyCandles);
  const mfiVal = mfi(dailyCandles);
  const atrVal = atr(dailyCandles);
  const fibVal = fibonacci(dailyCandles);
  const { supports, resistances } = findLevels(dailyCandles, last);

  return {
    lastPrice: last,
    rsi14: (rsiArr[rsiArr.length - 1] as number) ?? null,
    ma20,
    ma50,
    maState: ma20 && ma50 ? (ma20 > ma50 ? "bull" : "bear") : "neutral",
    macdHist: m.hist,
    bb,
    bbPosition: bb && bb.upper !== bb.lower ? (last - bb.lower) / (bb.upper - bb.lower) : null,
    stoch: stochK.k !== null && stochK.d !== null ? { k: Math.round(stochK.k), d: Math.round(stochK.d) } : null,
    mfi14: mfiVal !== null ? Math.round(mfiVal) : null,
    atr14: atrVal !== null ? Math.round(atrVal) : null,
    atrPct: atrVal !== null ? Math.round((atrVal / last) * 1000) / 10 : null,
    fib: fibVal,
    volRatio: volAvg > 0 ? vols[vols.length - 1] / volAvg : null,
    monthPct: pct(21),
    quarterPct: pct(63),
    fromYearHighPct: yearHigh ? ((last - yearHigh) / yearHigh) * 100 : null,
    fromYearLowPct: yearLow ? ((last - yearLow) / yearLow) * 100 : null,
    supports,
    resistances,
  };
}
