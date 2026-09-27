import type { Candle, MarketOverview, MoverRow, Quote, SearchResult } from "@/types/market";
import { promises as fs } from "fs";
import path from "path";

const BASE = "https://cdn.tsetmc.com/api";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const cache = new Map<string, { t: number; data: unknown }>();

async function tsetmcGet<T>(path: string, ttlMs: number, timeoutMs = 12000): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.t < ttlMs) return hit.data as T;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`TSETMC ${res.status}`);
      const data = (await res.json()) as T;
      cache.set(path, { t: Date.now(), data });
      return data;
    } catch (err) {
      lastErr = err;
      console.error(`[tsetmc] ${path} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/* ---------- raw endpoints ---------- */

interface OverviewRaw {
  marketOverview: MarketOverview;
}
interface MarketWatchRaw {
  marketwatch: {
    lva: string;
    lvc: string;
    eps: number;
    pe: string | null;
    pmd: number;
    pmn: number;
    py: number;
    pf: number;
    pdv: number;
    pcl: number;
    qtj: number;
    ztt: number;
    qtc: number;
    pMax: number;
    pMin: number;
    yVal: number;
    flow: number;
    insCode: string;
    hEven: number;
    csv: string | null;
  }[];
}
interface SearchRaw {
  instrumentSearch: {
    insCode: string;
    lVal30: string;
    lVal18AFC: string;
    flow: number;
  }[];
}
interface QuoteRaw {
  closingPriceInfo: {
    instrumentState: { cEtavalTitle: string } | null;
    lastHEven: number;
    finalLastDate: number;
    priceMin: number;
    priceMax: number;
    priceYesterday: number;
    priceFirst: number;
    pClosing: number;
    pDrCotVal: number;
    zTotTran: number;
    qTotTran5J: number;
    qTotCap: number;
  };
}
interface InstrumentInfoRaw {
  instrumentInfo: {
    eps: { epsValue: number | null; estimatedEPS: string | null; sectorPE: number | null };
    sector: { lSecVal: string } | null;
    staticThreshold: { psGelStaMax: number; psGelStaMin: number } | null;
    minWeek: number;
    maxWeek: number;
    minYear: number;
    maxYear: number;
    qTotTran5JAvg: number;
    dEven: number;
  };
}
interface ChartRaw {
  closingPriceChartData: {
    dEven: number;
    pDrCotVal: number;
    qTotTran5J: number;
    priceFirst: number;
    priceMin: number;
    priceMax: number;
  }[];
}

/* ---------- TSETMC chart date calibration ----------
 * dEven in chart data is a linear day-based value (consecutive days = 86400).
 * Anchored: 2026-09-21  <->  -17814211200
 */
const D_ANCHOR = -17814211200;
const DATE_ANCHOR_UTC = Date.UTC(2026, 8, 21);

function dEvenToDate(dEven: number): string {
  const days = Math.round((dEven - D_ANCHOR) / 86400);
  const ms = DATE_ANCHOR_UTC + days * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${dd}`;
}

/* ---------- public API ---------- */

export async function getMarketOverview(): Promise<MarketOverview> {
  const raw = await tsetmcGet<OverviewRaw>("/MarketData/GetMarketOverview/1", 15000);
  return raw.marketOverview;
}

/** تشخیص نوع ابزار مالی از روی نماد و مشخصات */
export function classifyInstrument(lva: string, lvc: string, yVal: number | string | null): string {
  const sym = (lva ?? "").trim();
  const name = (lvc ?? "").trim();
  const y = typeof yVal === "string" ? Number(yVal) : (yVal ?? 0);
  if (sym.startsWith("ض") || y === 311) return "اختیار معامله";
  if (sym.startsWith("ح ") || sym.endsWith("ح") || sym.startsWith("ح-")) return "حق تقدم";
  if (sym.startsWith("ط")) return "گواهی سپرده کالا";
  if (name.includes("صندوق") || name.includes("گواهی سپرده") || name.includes("ص.س.")) return "صندوق سرمایه‌گذاری";
  if (name.includes("مرابحه") || name.includes("اوراق") || sym.startsWith("مر")) return "اوراق با درآمد ثابت";
  if (y === 300 || y === 0) return "سهم";
  return "سایر ابزارها";
}

interface IdentityRaw {
  instrumentIdentity: {
    sector: { cSecVal: string | null; lSecVal: string | null } | null;
    subSector: { lSoSecVal: string | null } | null;
    cgrValCotTitle: string;
    yVal: string;
    lVal18AFC: string | null;
    lVal30: string | null;
    instrumentID: string | null;
  };
}

export async function getInstrumentIdentity(insCode: string) {
  const raw = await tsetmcGet<IdentityRaw>(`/Instrument/GetInstrumentIdentity/${insCode}`, 24 * 60 * 60 * 1000);
  return raw.instrumentIdentity;
}

function normalizeRow(r: MarketWatchRaw["marketwatch"][number]): MoverRow {
  /* قبل از اولین معامله، pdv صفر است — به قیمت پایانی برمی‌گردیم */
  const price = r.pdv > 0 ? r.pdv : r.pcl;
  /* ارزش معاملات: qtc واقعی؛ اگر صفر بود (اسنپ‌شات خارج از بازار) برآورد = حجم × قیمت */
  const value = r.qtc > 0 ? r.qtc : r.qtj > 0 ? r.qtj * price : 0;
  return {
    insCode: r.insCode,
    symbol: r.lva?.trim() ?? "",
    name: r.lvc?.trim() ?? "",
    type: classifyInstrument(r.lva, r.lvc, r.yVal),
    last: price,
    closing: r.pcl,
    yesterday: r.py,
    open: r.pf,
    high: r.pmd,
    low: r.pmn,
    volume: r.qtj,
    value,
    trades: r.ztt,
    lastPct: r.py > 0 && price > 0 ? ((price - r.py) / r.py) * 100 : 0,
    closingPct: r.py > 0 && r.pcl > 0 ? ((r.pcl - r.py) / r.py) * 100 : 0,
    allowedMax: r.pMax,
    allowedMin: r.pMin,
    eps: r.eps,
    pe: r.pe,
  };
}

/** آخرین اسنپ‌شات غیرخالی جدول بازار — روی دیسک، برای ساعاتی که TSETMC جدول را خالی می‌کند */
const MW_SNAPSHOT = path.join(process.cwd(), ".cache", "marketwatch.json");

/** خارج از بازار: بازسازی جدول از اعضای ۵۷ شاخص صناعتی */
async function rebuildFromSectorIndices(): Promise<MarketWatchRaw["marketwatch"]> {
  try {
    const idx = await tsetmcGet<{ indexB1: { insCode: string; lVal30: string }[] }>("/Index/GetIndexB1LastAll/1/1", 5 * 60 * 1000);
    const sectors = (idx.indexB1 ?? []).filter((i) => /^\d+-/.test(i.lVal30 ?? ""));
    const results = await Promise.allSettled(
      sectors.map((s) =>
        tsetmcGet<{
          indexCompany: {
            insCode: string;
            instrument: { lVal18AFC: string | null; lVal30: string | null } | null;
            priceYesterday: number;
            pDrCotVal: number;
            pClosing: number;
            priceFirst: number;
            priceMin: number;
            priceMax: number;
            qTotTran5J: number;
            zTotTran: number;
            qTotCap: number;
          }[];
        }>(`/ClosingPrice/GetIndexCompany/${s.insCode}`, 10 * 60 * 1000, 15000),
      ),
    );
    const rows: MarketWatchRaw["marketwatch"] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const m of r.value.indexCompany ?? []) {
        if (!m.instrument?.lVal18AFC || !(m.priceYesterday > 0) || !(m.pDrCotVal > 0)) continue;
        if (seen.has(m.insCode)) continue; // عضو چند شاخص = یک‌بار
        seen.add(m.insCode);
        rows.push({
          lva: m.instrument.lVal18AFC,
          lvc: m.instrument.lVal30 ?? "",
          eps: 0,
          pe: null,
          pmd: m.priceMax ?? 0,
          pmn: m.priceMin ?? 0,
          py: m.priceYesterday,
          pf: m.priceFirst ?? 0,
          pdv: m.pDrCotVal,
          pcl: m.pClosing ?? 0,
          qtj: m.qTotTran5J ?? 0,
          ztt: m.zTotTran ?? 0,
          qtc: m.qTotCap ?? 0,
          pMax: 0,
          pMin: 0,
          yVal: 300,
          flow: 1,
          insCode: m.insCode,
          hEven: 0,
          csv: null,
        });
      }
    }
    return rows;
  } catch {
    return [];
  }
}

/** جدول دارای معاملات واقعی است؟ (پیش‌گشایش‌ها qtj=0 دارند) */
const hasRealVolume = (rows: MarketWatchRaw["marketwatch"]) => rows.some((r) => (r.qtj ?? 0) > 0);

async function persistSnapshot(rows: MarketWatchRaw["marketwatch"]) {
  try {
    await fs.mkdir(path.dirname(MW_SNAPSHOT), { recursive: true });
    await fs.writeFile(MW_SNAPSHOT, JSON.stringify(rows), "utf8");
  } catch {
    /* ignore */
  }
}

export async function getMarketWatchRows(): Promise<MarketWatchRaw["marketwatch"]> {
  const raw = await tsetmcGet<MarketWatchRaw>("/ClosingPrice/GetMarketWatch?market=1", 45000, 18000);
  const rows = raw.marketwatch ?? [];

  if (rows.length > 0 && hasRealVolume(rows)) {
    /* جلسه در جریان — بهترین داده ممکن: ذخیره و برگردان */
    await persistSnapshot(rows);
    return rows;
  }

  /* جدول خالی یا پوسته پیش‌گشایش — لایه ۱: اسنپ‌شات دیسک با حجم واقعی */
  try {
    const cached = await fs.readFile(MW_SNAPSHOT, "utf8");
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((r: { qtj?: number }) => (r.qtj ?? 0) > 0)) {
      return parsed;
    }
  } catch {
    /* ignore */
  }

  /* لایه ۲: بازسازی از شاخص‌های صناعتی (دیتای آخرین جلسه) */
  const rebuilt = await rebuildFromSectorIndices();
  if (rebuilt.length > 0 && hasRealVolume(rebuilt)) {
    await persistSnapshot(rebuilt);
    return rebuilt;
  }

  return rows;
}

export async function getMovers(): Promise<{
  gainers: MoverRow[];
  losers: MoverRow[];
  active: MoverRow[];
  updatedAt: number;
}> {
  const byLast = (a: MoverRow, b: MoverRow) => b.lastPct - a.lastPct;
  /* حذف نمادهای تکراری (بعضی نمادها دو ردیف در جدول TSETMC دارند) */
  const seenSym = new Set<string>();
  const rows = (await getMarketWatchRows())
    .filter((r) => (r.flow === 1 || r.flow === 2) && r.py > 0 && r.yVal > 0 && (r.pdv > 0 || r.pcl > 0))
    .map(normalizeRow)
    .filter((r) => {
      const k = `${r.symbol}|${r.name}`;
      if (seenSym.has(k)) return false;
      seenSym.add(k);
      return true;
    });
  /* ۶۰ تا بفرست تا فیلتر نوع در UI هنوز ۱۰ تا کامل داشته باشه */
  const gainers = [...rows].sort(byLast).slice(0, 60);
  const losers = [...rows].sort((a, b) => a.lastPct - b.lastPct).slice(0, 60);
  /* ارزش معاملات: فقط نمادهایی که واقعا معامله شده‌اند (بدون معامله، رتبه ارزش ندارند) */
  const active = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 60);
  return { gainers, losers, active, updatedAt: Date.now() };
}

/** عملکرد امروز شاخص‌های صناعتی */
export async function getSectorPerformance(): Promise<{ name: string; pct: number }[]> {
  const raw = await tsetmcGet<{ indexB1: { lVal30: string; xVarIdxJRfV: number }[] }>(
    "/Index/GetIndexB1LastAll/1/1",
    5 * 60 * 1000,
  );
  return (raw.indexB1 ?? [])
    .filter((i) => /^\d+-/.test(i.lVal30 ?? "") && typeof i.xVarIdxJRfV === "number")
    .map((i) => ({ name: i.lVal30.replace(/^\d+-/, "").trim(), pct: Math.round(i.xVarIdxJRfV * 100) / 100 }))
    .sort((a, b) => b.pct - a.pct);
}

/** کوت چند نماد مشخص (بدون فیلتر برترین‌ها) */
export async function getQuotesByCodes(codes: string[]): Promise<MoverRow[]> {
  if (codes.length === 0) return [];
  const rows = await getMarketWatchRows();
  return rows
    .filter((r) => codes.includes(r.insCode) && r.py > 0)
    .map(normalizeRow);
}

/* ---------- حقیقی/حقوقی ---------- */

export interface ClientTypeRow {
  date: number;
  buyIVolume: number;
  buyNVolume: number;
  sellIVolume: number;
  sellNVolume: number;
  buyICount: number;
  sellICount: number;
}

/** داده حقیقی/حقوقی امروز (تجمعی لحظه‌ای) */
export async function getClientTypeToday(insCode: string, date: number): Promise<ClientTypeRow | null> {
  const raw = await tsetmcGet<{ clientType: Record<string, number>[] }>(
    `/ClientType/GetClientType/${insCode}/${date}/1`,
    60000,
  );
  const rows = raw.clientType ?? [];
  const last = rows[rows.length - 1];
  if (!last) return null;
  return {
    date,
    buyIVolume: last.buy_I_Volume ?? 0,
    buyNVolume: last.buy_N_Volume ?? 0,
    sellIVolume: last.sell_I_Volume ?? 0,
    sellNVolume: last.sell_N_Volume ?? 0,
    buyICount: last.buy_CountI ?? last.buy_I_Count ?? 0,
    sellICount: last.sell_CountI ?? last.sell_I_Count ?? 0,
  };
}

/** تاریخچه روزانه حقیقی/حقوقی — ۴۰ روز اخیر (API از جدید به قدیم می‌فرستد!) */
export async function getClientTypeHistory(insCode: string): Promise<ClientTypeRow[]> {
  const raw = await tsetmcGet<{
    clientType: { recDate: number; buy_I_Volume: number; buy_N_Volume: number; sell_I_Volume: number; sell_N_Volume: number; buy_I_Count?: number; sell_I_Count?: number }[];
  }>(`/ClientType/GetClientTypeHistory/${insCode}`, 6 * 60 * 60 * 1000);
  return (raw.clientType ?? [])
    .sort((a, b) => b.recDate - a.recDate) // جدیدترین اول
    .slice(0, 40)
    .sort((a, b) => a.recDate - b.recDate) // برای نمودار: قدیم به جدید
    .map((r) => ({
      date: r.recDate,
      buyIVolume: r.buy_I_Volume ?? 0,
      buyNVolume: r.buy_N_Volume ?? 0,
      sellIVolume: r.sell_I_Volume ?? 0,
      sellNVolume: r.sell_N_Volume ?? 0,
      buyICount: r.buy_I_Count ?? 0,
      sellICount: r.sell_I_Count ?? 0,
    }));
}

/** سهم‌های هم‌گروه (هم‌صنعت) — از طریق شاخص صناعتی + داده زنده جدول بازار */
export interface PeerRow {
  insCode: string;
  symbol: string;
  name: string;
  pct: number;
  price: number;
  pe: number | null;
  value: number;
  self: boolean;
}

export async function getPeers(insCode: string): Promise<{
  sectorName: string | null;
  peers: PeerRow[];
  stats: { avgPct: number; up: number; down: number; selfRank: number | null; total: number } | null;
}> {
  const identity = await getInstrumentIdentity(insCode).catch(() => null);
  const sectorCode = identity?.sector?.cSecVal?.trim() || null;
  const sectorName = identity?.sector?.lSecVal?.trim() || null;
  if (!sectorCode) return { sectorName, peers: [], stats: null };

  const idxRaw = await tsetmcGet<{ indexB1: { insCode: string; lVal30: string }[] }>(
    "/Index/GetIndexB1LastAll/1/1",
    5 * 60 * 1000,
  );
  const sectorIdx = (idxRaw.indexB1 ?? []).find((i) => i.lVal30?.startsWith(`${sectorCode}-`));
  if (!sectorIdx) return { sectorName, peers: [], stats: null };

  const companyRaw = await tsetmcGet<{
    indexCompany: {
      insCode: string;
      instrument: { lVal18AFC: string | null; lVal30: string | null } | null;
      priceYesterday: number;
      pDrCotVal: number;
      qTotCap: number;
    }[];
  }>(`/ClosingPrice/GetIndexCompany/${sectorIdx.insCode}`, 10 * 60 * 1000);

  /* اتصال به جدول زنده بازار برای قیمت/PE/ارزش */
  const watchRows = await getMarketWatchRows();
  const watchByCode = new Map(watchRows.map((r) => [r.insCode, r]));

  const members = (companyRaw.indexCompany ?? [])
    .filter((c) => c.priceYesterday > 0 && c.pDrCotVal > 0 && c.instrument?.lVal18AFC)
    .slice(0, 25)
    .map((c) => {
      const w = watchByCode.get(c.insCode);
      const price = w?.pdv ?? c.pDrCotVal;
      const yesterday = w?.py ?? c.priceYesterday;
      const eps = w?.eps && w.eps > 0 ? w.eps : null;
      return {
        insCode: c.insCode,
        symbol: (w?.lva ?? c.instrument?.lVal18AFC ?? "").trim(),
        name: (w?.lvc ?? c.instrument?.lVal30 ?? "").trim(),
        pct: yesterday > 0 ? Math.round(((price - yesterday) / yesterday) * 10000) / 100 : 0,
        price,
        pe: eps ? Math.round((price / eps) * 10) / 10 : null,
        value: w?.qtc ?? c.qTotCap,
        self: c.insCode === insCode,
      };
    });

  const peers = members.sort((a, b) => b.value - a.value).slice(0, 15);
  if (peers.length < 2) return { sectorName, peers: [], stats: null };

  const avgPct = Math.round((peers.reduce((s, p) => s + p.pct, 0) / peers.length) * 100) / 100;
  const up = peers.filter((p) => p.pct > 0).length;
  const down = peers.filter((p) => p.pct < 0).length;
  const self = peers.find((p) => p.self);
  const selfRank = self ? [...peers].sort((a, b) => b.pct - a.pct).findIndex((p) => p.self) + 1 : null;

  return {
    sectorName,
    peers,
    stats: { avgPct, up, down, selfRank, total: peers.length },
  };
}

export async function searchInstruments(q: string): Promise<SearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const raw = await tsetmcGet<SearchRaw>(
    `/Instrument/GetInstrumentSearch/${encodeURIComponent(query)}`,
    120000,
  );
  const seen = new Set<string>();
  return (raw.instrumentSearch ?? [])
    .filter((r) => r.flow === 1 || r.flow === 2)
    .filter((r) => {
      if (seen.has(r.lVal18AFC)) return false;
      seen.add(r.lVal18AFC);
      return true;
    })
    .sort((a, b) => {
      const qa = a.lVal18AFC === query ? 0 : 1;
      const qb = b.lVal18AFC === query ? 0 : 1;
      return qa - qb;
    })
    .slice(0, 12)
    .map((r) => ({
      insCode: r.insCode,
      symbol: r.lVal18AFC?.trim() ?? "",
      name: r.lVal30?.trim() ?? "",
      flow: r.flow,
      type: classifyInstrument(r.lVal18AFC, r.lVal30, (r as { yVal?: string }).yVal ?? null),
    }));
}

export async function getQuote(insCode: string): Promise<Quote> {
  /* سریع: فقط از اندیس (کش ۲۴ساعته) و اینفو (کش ۵دقیقه‌ای) — بدون جدول سنگین بازار */
  const [quoteRaw, infoRaw, identity] = await Promise.all([
    tsetmcGet<QuoteRaw>(`/ClosingPrice/GetClosingPriceInfo/${insCode}`, 10000),
    tsetmcGet<InstrumentInfoRaw>(`/Instrument/GetInstrumentInfo/${insCode}`, 300000).catch(() => null),
    getInstrumentIdentity(insCode).catch(() => null),
  ]);
  const q = quoteRaw.closingPriceInfo;
  const i = infoRaw?.instrumentInfo;
  const sym = identity?.lVal18AFC?.trim() || "";
  const name = identity?.lVal30?.trim() || "";
  const lastPct = q.priceYesterday > 0 ? ((q.pDrCotVal - q.priceYesterday) / q.priceYesterday) * 100 : 0;
  const closingPct = q.priceYesterday > 0 ? ((q.pClosing - q.priceYesterday) / q.priceYesterday) * 100 : 0;
  const eps = i ? (i.eps.epsValue ?? (Number(i.eps.estimatedEPS) || null)) : null;
  return {
    insCode,
    insId: identity?.instrumentID?.trim() || null,
    symbol: sym,
    name,
    type: classifyInstrument(sym, name, identity?.yVal ?? null),
    marketTitle: identity?.cgrValCotTitle?.trim() || null,
    subSector: identity?.subSector?.lSoSecVal?.trim() || null,
    sectorCode: identity?.sector?.cSecVal?.trim() || null,
    last: q.pDrCotVal,
    closing: q.pClosing,
    yesterday: q.priceYesterday,
    open: q.priceFirst,
    high: q.priceMax,
    low: q.priceMin,
    volume: q.qTotTran5J,
    value: q.qTotCap,
    trades: q.zTotTran,
    allowedMax: i?.staticThreshold?.psGelStaMax ?? 0,
    allowedMin: i?.staticThreshold?.psGelStaMin ?? 0,
    lastPct,
    closingPct,
    state: q.instrumentState?.cEtavalTitle?.trim() ?? "",
    date: q.finalLastDate,
    time: q.lastHEven,
    eps,
    pe: eps && eps > 0 ? String(Math.round((q.pDrCotVal / eps) * 10) / 10) : null,
    sectorName: i?.sector?.lSecVal?.trim() || identity?.sector?.lSecVal?.trim() || null,
    sectorPE: i?.eps.sectorPE ?? null,
    yearMin: i?.minYear ?? null,
    yearMax: i?.maxYear ?? null,
    weekMin: i?.minWeek ?? null,
    weekMax: i?.maxWeek ?? null,
    monthAvgVolume: i?.qTotTran5JAvg ?? null,
  };
}

export async function getDailyChart(insCode: string, limit = 450): Promise<Candle[]> {
  const raw = await tsetmcGet<ChartRaw>(`/ClosingPrice/GetChartData/${insCode}/0`, 180000);
  const all = raw.closingPriceChartData ?? [];
  /* دیتای TSETMC ممکنه تاریخ تکراری/نامرتب داشته باشه — lw-charts با تکراری می‌شکنه */
  const byDate = new Map<string, Candle>();
  for (const c of all) {
    if (!c || typeof c.dEven !== "number" || !Number.isFinite(c.dEven)) continue;
    const date = dEvenToDate(c.dEven);
    if (!date || date.length !== 8) continue;
    const candle: Candle = {
      date,
      open: c.priceFirst,
      high: c.priceMax,
      low: c.priceMin,
      close: c.pDrCotVal,
      volume: c.qTotTran5J,
    };
    if (![candle.open, candle.high, candle.low, candle.close, candle.volume].every((v) => Number.isFinite(v) && v >= 0)) continue;
    if (candle.high < candle.low) continue;
    byDate.set(date, candle); // آخرین رکورد هر تاریخ می‌مونه
  }
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-limit);
}

export interface IntradayPoint {
  time: string;
  price: number;
  cumVolume: number;
}

export async function getIntraday(insCode: string, date: number): Promise<IntradayPoint[]> {
  const raw = await tsetmcGet<{ closingPriceHistory: { hEven: number; pClosing: number; qTotTran5J: number }[] }>(
    `/ClosingPrice/GetClosingPriceHistory/${insCode}/${date}`,
    20000,
  );
  /* حذف تکراری‌ها (آخرین تیک هر لحظه می‌مونه) + مرتب‌سازی زمانی */
  const byTime = new Map<string, IntradayPoint>();
  for (const r of raw.closingPriceHistory ?? []) {
    const time = String(r.hEven).padStart(6, "0").replace(/(\d{2})(\d{2})(\d{2})/, "$1:$2:$3");
    byTime.set(time, { time, price: r.pClosing, cumVolume: r.qTotTran5J });
  }
  return [...byTime.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, p]) => p);
}
