import { getMarketWatchRows, getDailyChart } from "@/lib/tsetmc";
import { computeSummary } from "@/lib/indicators";
import { fundamentalStore, getLatest } from "@/lib/analysis-store";

export interface ScanResult {
  insCode: string;
  symbol: string;
  name: string;
  price: number;
  lastPct: number;
  score: number;
  reasons: string[];
  monthPct: number | null;
  volRatio: number | null;
  rsi: number | null;
  /** وضعیت فاندامنتال اگر قبلا تحلیل شده باشد — برای عدم تناقض با اسکن تکنیکال */
  fundVerdict: "خرید" | "هولد" | "فروش" | null;
  fundScore: number | null;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** امتیاز قطعی اسکنر — هر بخش امتیاز = یک دلیل مستند */
function scoreStock(s: ReturnType<typeof computeSummary>, todayPct: number): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (s.volRatio !== null && s.volRatio >= 1.3) {
    score += 22;
    reasons.push(`حجم ${s.volRatio.toFixed(1)}× میانگین — ورود پول`);
  }
  if (s.monthPct !== null && s.monthPct >= 3 && s.monthPct <= 30) {
    score += 20;
    reasons.push(`مومنتوم ماهانه +${Math.round(s.monthPct)}٪`);
  }
  if (s.rsi14 !== null && s.rsi14 >= 45 && s.rsi14 <= 68) {
    score += 18;
    reasons.push(`RSI سالم (${Math.round(s.rsi14)}) — مومنتوم بدون اشباع`);
  }
  if (s.maState === "bull") {
    score += 15;
    reasons.push("میانگین‌های ۲۰/۵۰ صعودی");
  }
  if (s.supports.length > 0 && s.lastPrice - s.supports[0] < s.lastPrice * 0.04) {
    score += 15;
    reasons.push(`چسبیده به حمایت ${s.supports[0].toLocaleString("fa-IR")}`);
  }
  if (todayPct > 0) {
    score += 10;
    reasons.push(`امروز مثبت (${todayPct.toFixed(1)}٪)`);
  }
  if (s.quarterPct !== null && s.quarterPct > 0) {
    score += 10;
    reasons.push(`فصل مثبت (${Math.round(s.quarterPct)}٪)`);
  }

  return { score: clamp(Math.round(score), 0, 100), reasons };
}

/** اسکن بازار: سهم‌های پرحجم → امتیازدهی قطعی → برترین‌ها */
export async function scanMarket(): Promise<ScanResult[]> {
  const watch = await getMarketWatchRows();
  const seenScan = new Set<string>();
  const candidates = watch
    .filter(
      (r) =>
        (r.flow === 1 || r.flow === 2) &&
        r.py > 0 &&
        r.yVal > 0 &&
        r.pdv > 0 &&
        r.qtc > 5_000_000_000 && // نقدشوندگی: حداقل ۵۰۰ میلیون تومان معامله
        !/صندوق/.test(r.lvc ?? ""),
    )
    .filter((r) => {
      const k = `${r.lva?.trim()}|${r.lvc?.trim()}`;
      if (seenScan.has(k)) return false;
      seenScan.add(k);
      return true;
    })
    .sort((a, b) => b.qtc - a.qtc)
    .slice(0, 80);

  const results: ScanResult[] = [];
  const BATCH = 15;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const settled = await Promise.allSettled(
      batch.map(async (r) => {
        const candles = await getDailyChart(r.insCode, 260);
        if (candles.length < 60) return null;
        const s = computeSummary(candles, candles);
        const todayPct = r.py > 0 ? ((r.pdv - r.py) / r.py) * 100 : 0;
        const { score, reasons } = scoreStock(s, todayPct);
        /* صلیب با فاندامنتال (اگر قبلا تحلیل شده) */
        const fundData = getLatest(fundamentalStore, r.insCode, 6 * 60 * 60 * 1000);
        return {
          insCode: r.insCode,
          symbol: r.lva?.trim() ?? "",
          name: r.lvc?.trim() ?? "",
          price: r.pdv,
          lastPct: todayPct,
          score,
          reasons,
          monthPct: s.monthPct,
          volRatio: s.volRatio,
          rsi: s.rsi14,
          fundVerdict: fundData?.analysis?.conclusion ?? null,
          fundScore: fundData?.analysis?.score ?? null,
        } as ScanResult;
      }),
    );
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value) results.push(s.value);
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
