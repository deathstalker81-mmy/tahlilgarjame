export interface CodalLetter {
  tracingNo: number;
  title: string;
  publishDateTime: string;
  pubDate: number;
  url: string;
  category: string;
  important: boolean;
}

const div = (a: number, b: number) => ~~(a / b);

/** تبدیل تاریخ شمسی به میلادی (الگوریتم استاندارد jalaali) */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let y = jy;
  let days: number;
  let gy = y <= 979 ? 621 : 1600;
  y -= y <= 979 ? 0 : 979;
  days = 365 * y + div(y, 33) * 8 + div((y % 33) + 3, 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthLens = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (; gm <= 12; gm++) {
    if (gd <= monthLens[gm]) break;
    gd -= monthLens[gm];
  }
  return [gy, gm, gd];
}

function faDigitsToEn(s: string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

/** "۱۴۰۵/۰۶/۰۴ ۱۵:۲۳:۵۲" -> timestamp ms */
function persianDateToMs(s: string): number {
  try {
    const cleaned = faDigitsToEn(s.replace(/[^۰-۹0-9/: ]/g, "").trim());
    const m = cleaned.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?/);
    if (!m) return 0;
    const [gy, gm, gd] = jalaliToGregorian(Number(m[1]), Number(m[2]), Number(m[3]));
    return Date.UTC(gy, gm - 1, gd, Number(m[4] ?? 12), Number(m[5] ?? 0), Number(m[6] ?? 0));
  } catch {
    return 0;
  }
}

function classifyLetter(title: string): { category: string; important: boolean } {
  const t = title.replace(/\s+/g, " ");
  if (/افشای اطلاعات بااهمیت/.test(t)) return { category: "افشای بااهمیت", important: true };
  if (/افزایش سرمایه|اندوخته/.test(t)) return { category: "افزایش سرمایه", important: true };
  if (/تصمیمات مجمع عمومی فوق العاده/.test(t)) return { category: "مجمع فوق‌العاده", important: true };
  if (/تصمیمات مجمع عمومی عادی/.test(t)) return { category: "مجمع عادی", important: true };
  if (/صورت.?های مالی/.test(t)) return { category: "صورت‌های مالی", important: true };
  if (/گزارش فعالیت ماهانه/.test(t)) return { category: "گزارش ماهانه", important: true };
  if (/پرداخت سود|تقسیم سود|سود تقسیمی/.test(t)) return { category: "تقسیم سود", important: true };
  if (/معاملات مدیران|معامله مدیران/.test(t)) return { category: "معاملات مدیران", important: true };
  if (/توقف|ازسرند|از سرند/.test(t)) return { category: "توقف/ازسرند", important: true };
  if (/توضیحات/.test(t)) return { category: "توضیحات مدیریت", important: true };
  if (/قرارداد|مناقصه|مزایده/.test(t)) return { category: "قرارداد", important: false };
  return { category: "سایر", important: false };
}

const cache = new Map<string, { t: number; data: CodalLetter[] }>();
const TTL = 5 * 60 * 1000;

/** تشخیص گروه اهمیت اطلاعیه (الف/ب) — از تیتر رسمی کدال */
export function letterGroup(title: string): "الف" | "ب" | null {
  if (/گروه الف/.test(title)) return "الف";
  if (/گروه ب\b|گروه ب\)|گروه ب-|گروه ب /.test(title)) return "ب";
  return null;
}

/** اطلاعیه‌های جدیدترین اسناد همه شرکت‌ها (خبرجریان کدال) */
export async function fetchMarketCodalLetters(max = 30): Promise<(CodalLetter & { symbol: string; group: "الف" | "ب" | null })[]> {
  const hit = cache.get("market-codal");
  if (hit && Date.now() - hit.t < TTL) return hit.data as never;
  const params = new URLSearchParams({
    LetterType: "-1",
    AuditorRef: "-1",
    PageNumber: "1",
    Audited: "true",
    NotAudited: "true",
    IsNotAudited: "false",
    Childs: "false",
    Mains: "true",
    Publisher: "false",
    CompanyState: "-1",
    ReportingType: "-1",
    Category: "-1",
    CompanyType: "-1",
    Consolidatable: "true",
    NotConsolidatable: "true",
    TracingNo: "-1",
    Length: "-1",
  });
  const res = await fetch(`https://search.codal.ir/api/search/v2/q?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Codal ${res.status}`);
  const json = (await res.json()) as {
    Letters: { TracingNo: number; Title: string; PublishDateTime: string; Url: string; Symbol: string }[];
  };
  const letters = (json.Letters ?? [])
    .filter((l) => l.Title && l.Url)
    .slice(0, max)
    .map((l) => {
      const { category, important } = classifyLetter(l.Title);
      return {
        tracingNo: l.TracingNo,
        title: l.Title.replace(/\s+/g, " ").trim(),
        publishDateTime: l.PublishDateTime ?? "",
        pubDate: persianDateToMs(l.PublishDateTime ?? ""),
        url: `https://www.codal.ir${l.Url}`,
        category,
        important,
        symbol: (l.Symbol ?? "").trim(),
        group: letterGroup(l.Title),
      };
    });
  if (letters.length > 0) cache.set("market-codal", { t: Date.now(), data: letters as never });
  return letters;
}

/* ---------- خواندن محتوای اطلاعیه (اکسل-HTML کدال) ---------- */

export interface LetterContent {
  serial: string;
  kind: "monthly" | "financial" | "explanation";
  title: string;
  rows: string[];
}

const htmlCache = new Map<string, { t: number; data: LetterContent }>();
const HTML_TTL = 6 * 60 * 60 * 1000;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#160;|&nbsp;|\u00a0/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** متن یک اطلاعیه: جدول‌هایش به صورت مارک‌داون (با رعایت colspan) تا AI ستون‌ها را ببیند */
export async function fetchLetterContent(
  letter: CodalLetter,
  kind: LetterContent["kind"],
): Promise<LetterContent> {
  const key = `${letter.tracingNo}`;
  const hit = htmlCache.get(key);
  if (hit && Date.now() - hit.t < HTML_TTL) return hit.data;

  const m = letter.url.match(/LetterSerial=([^&]+)/);
  if (!m) throw new Error("serial یافت نشد");
  const excelUrl = `https://excel.codal.ir/service/Excel/GetAll/${m[1]}/0`;

  const res = await fetch(excelUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.codal.ir/" },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`codal-excel ${res.status}`);
  const html = await res.text();
  console.log("[codal-excel] url:", excelUrl.slice(0, 80), "| html len:", html.length, "| tr:", (html.match(/<tr/gi) ?? []).length, "| magic:", html.slice(0, 20).replace(/\s/g, " "));

  /* ردیف‌ها + سلول‌ها (با colspan تکرار می‌شوند تا ستون‌ها تراز بمانند) */
  const rowsAsCells: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells: string[] = [];
    for (const td of tr.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) ?? []) {
      const txt = decodeEntities(td.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const spanMatch = td.match(/colspan\s*=\s*"?(\d+)"?/i);
      const span = spanMatch ? Math.min(Number(spanMatch[1]), 6) : 1;
      for (let s = 0; s < span; s++) cells.push(txt);
    }
    if (cells.some((c) => c.length > 0)) rowsAsCells.push(cells);
  }

  const toMd = (cells: string[]) => `| ${cells.join(" | ")} |`;
  let rows: string[];
  if (kind === "monthly" && rowsAsCells.length > 3) {
    /* سربرگ دوطبقه: گروه ستون‌ها (ردیف اول) + زیربرگ (ردیف دوم) → لیبل کامل هر ستون */
    const h0 = rowsAsCells[0];
    const h1 = rowsAsCells[1] ?? [];
    const width = Math.max(h0.length, h1.length);
    const combined: string[] = [];
    for (let i = 0; i < width; i++) {
      combined.push(`${h0[i] ?? ""} ${h1[i] ?? ""}`.replace(/\s+/g, " ").trim());
    }
    rows = [toMd(combined), ...rowsAsCells.slice(2).map(toMd)].slice(0, 45);
  } else if (kind === "monthly") {
    rows = rowsAsCells.map(toMd).slice(0, 45);
  } else if (kind === "financial") {
    rows = rowsAsCells
      .filter((cells) => cells.some((c) => /فروش|بهای تمام|سود ناخالص|سود عملیاتی|سود خالص|سود هر سهم|وجه نقد|فعالیت عملیاتی|فعالیت سرمایه‌گذاری|فعالیت تأمین|مالیات|اندوخته|سود انباشته|شرح/.test(c)))
      .map(toMd)
      .slice(0, 70);
  } else {
    rows = rowsAsCells.map(toMd).slice(0, 40);
  }

  const content: LetterContent = { serial: m[1], kind, title: letter.title, rows };
  htmlCache.set(key, { t: Date.now(), data: content });
  return content;
}

/** جدول‌های یک اطلاعیه — هر <table> یک آرایه دو‌بعدی از سلول‌ها (colspan باز شده) */
export async function fetchLetterTables(letter: CodalLetter): Promise<string[][][]> {
  const key = `tbl-${letter.tracingNo}`;
  const hit = htmlCache.get(key);
  if (hit && Date.now() - hit.t < HTML_TTL) return (hit.data as unknown as string[][][]) ?? [];

  const m = letter.url.match(/LetterSerial=([^&]+)/);
  if (!m) throw new Error("serial یافت نشد");
  const excelUrl = `https://excel.codal.ir/service/Excel/GetAll/${m[1]}/0`;
  const res = await fetch(excelUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.codal.ir/" },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`codal-excel ${res.status}`);
  const html = await res.text();

  const tables: string[][][] = [];
  for (const tbl of html.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const rows: string[][] = [];
    for (const tr of tbl.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const cells: string[] = [];
      for (const td of tr.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) ?? []) {
        const txt = decodeEntities(td.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
        const sm = td.match(/colspan\s*=\s*"?(\d+)"?/i);
        const span = sm ? Math.min(Number(sm[1]), 8) : 1;
        for (let s = 0; s < span; s++) cells.push(txt);
      }
      if (cells.some((c) => c.length > 0)) rows.push(cells);
    }
    if (rows.length >= 2) tables.push(rows);
  }
  htmlCache.set(key, { t: Date.now(), data: tables as unknown as LetterContent });
  return tables;
}

/* ---------- استخراج قطعی نسبیت‌های مالی از صورت‌های مالی ---------- */

export interface FinancialSnapshot {
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

/** "(۳,۴۹۳,۴۱۴,۵۲۹)" یا "۹۱۸,۶۲۴" → عدد (پرانتز = منفی) */
function parseNumCell(s: string | undefined): number | null {
  if (!s) return null;
  let t = s.trim().replace(/[(),،]/g, (ch) => (ch === "(" || ch === ")" ? (ch === "(" ? "-" : "") : ""));
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  t = t.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d))).replace(/[^\d.-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** آخرین سلول عددی از راست (دوره جاری) و بعدی (دوره قبل) */
function takeNums(cells: string[]): { current: number | null; prior: number | null } {
  const nums = cells.slice(1).map(parseNumCell).filter((n): n is number => n !== null);
  return { current: nums[0] ?? null, prior: nums[1] ?? null };
}

export async function extractFinancials(letter: CodalLetter): Promise<FinancialSnapshot | null> {
  /* اسکن مسطح: همه ردیف‌های سند به ترتیب (جدول‌های تو در تو قابل جداسازی نیستند ولی لیبل‌ها کافی‌اند) */
  const excelUrl = `https://excel.codal.ir/service/Excel/GetAll/${letter.url.match(/LetterSerial=([^&]+)/)?.[1]}/0`;
  const res = await fetch(excelUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.codal.ir/" },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const html = await res.text();

  const allRows: string[][] = [];
  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells: string[] = [];
    for (const td of tr.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) ?? []) {
      const txt = decodeEntities(td.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const sm = td.match(/colspan\s*=\s*"?(\d+)"?/i);
      const span = sm ? Math.min(Number(sm[1]), 8) : 1;
      for (let s = 0; s < span; s++) cells.push(txt);
    }
    if (cells.some((c) => c.length > 0)) allRows.push(cells);
  }

  const findRow = (re: RegExp, exclude?: RegExp) =>
    allRows.find((cells) => {
      const head = `${cells[0] ?? ""} ${cells[1] ?? ""}`;
      return re.test(head) && !(exclude?.test(head) ?? false);
    });

  const rowSales = findRow(/^(درآمد|درآمدهاي|درآمدهای|فروش)/, /هزينه|هزینه|برگشت|تخفيف|تخفیف|سهام|عصر|ارزش ثبت/);
  const rowGross = findRow(/سود.{0,8}ناخالص/);
  const rowOperating = findRow(/سود.{0,8}عملياتى|سود.{0,8}عملیاتی/);
  const rowNet = findRow(/سود.{0,8}خالص/, /هر سهم/);
  const rowEquity = findRow(/^جمع حقوق مالکانه|^جمع حقوق مالكان/);
  const rowDebt = findRow(/^جمع بدهي‌ها( |$)/, /^$/);
  const epsHeaderRow = allRows.find((r) => /سود هر سهم/.test(r.join(" ")) && /سال مالي|سال مالی/.test(r.join(" ")) && r.length <= 6);

  if (!rowGross || !rowNet || !rowEquity) return null;

  const sales = rowSales ? takeNums(rowSales) : { current: null, prior: null };
  const gross = takeNums(rowGross);
  const operating = rowOperating ? takeNums(rowOperating) : { current: null, prior: null };
  const net = takeNums(rowNet);
  const equityRow = takeNums(rowEquity);
  const debtRowNums = rowDebt ? takeNums(rowDebt) : { current: null, prior: null };

  const salesC = sales.current ?? (gross.current !== null && gross.prior !== null ? gross.current + gross.prior : null);
  if (!salesC || !net.current || !equityRow.current) return null;

  const yearLabel = (allRows[0]?.find((c) => /۱۴۰\d/.test(c)) ?? "").replace(/\s+/g, " ").trim();

  /* روند EPS — ردیف «...هر سهم» — اولین ردیف دارای مقدار (ترجیح: خالص) */
  const epsTrend: { year: string; eps: number }[] = [];
  let epsCurrent: number | null = null;
  let epsPrior: number | null = null;
  const epsCandidates = allRows.filter((r) => /(خالص|پايه|پایه).{0,6}هر سهم/.test(r.join(" ")));
  for (const r of epsCandidates) {
    if (!/خالص/.test(r.join(" "))) continue;
    const nums = r.slice(1).map(parseNumCell).filter((n): n is number => n !== null);
    if (nums.length >= 2) { epsCurrent = nums[0]; epsPrior = nums[1]; break; }
  }
  if (epsCurrent === null) {
    for (const r of epsCandidates) {
      const nums = r.slice(1).map(parseNumCell).filter((n): n is number => n !== null);
      if (nums.length >= 2) { epsCurrent = nums[0]; epsPrior = nums[1]; break; }
    }
  }

  /* روند ۶ ساله فروش + حاشیه — سربرگ سال‌ها، ردیف فروش، ردیف بهای تمام‌شده */
  const salesTrend: { year: string; sales: number; margin: number | null }[] = [];
  const trendHeaderIdx = allRows.findIndex((r) => /۱۳۹۹\/۱۲\/۳۰/.test(r.join(" ")) && /شرح/.test(r.join(" ")));
  if (trendHeaderIdx >= 0) {
    const header = allRows[trendHeaderIdx];
    const salesRow = allRows[trendHeaderIdx + 1];
    const cogsRow = allRows[trendHeaderIdx + 2];
    if (salesRow && /مبلغ فروش/.test(salesRow.join(" "))) {
      const years = header.filter((c) => /سال مالي|سال مالی|برآورد/.test(c)).map((c) => c.match(/(۱۴۰[۰-۹]|۱۳۹۹)/)?.[1] ?? "");
      const salesVals = salesRow.slice(1).map(parseNumCell).filter((n): n is number => n !== null);
      const cogsVals = cogsRow && /بهاى تمام|بهای تمام/.test(cogsRow.join(" ")) ? cogsRow.slice(1).map(parseNumCell).filter((n): n is number => n !== null) : [];
      years.forEach((y, i) => {
        if (!y || salesVals[i] === undefined) return;
        const s = Math.abs(salesVals[i]);
        const c = Math.abs(cogsVals[i] ?? NaN);
        const margin = Number.isFinite(c) && s > 0 ? Math.round((((s - c) / s) * 100) * 10) / 10 : null;
        salesTrend.push({ year: y, sales: s, margin });
      });
    }
  }

  return {
    yearLabel,
    sales: salesC,
    netProfit: net.current,
    netProfitPrior: net.prior,
    grossProfit: gross.current ?? 0,
    operatingProfit: operating.current,
    equity: equityRow.current,
    debt: debtRowNums.current ?? 0,
    grossMargin: gross.current && salesC ? Math.round(((gross.current / salesC) * 100) * 10) / 10 : 0,
    operatingMargin: operating.current && salesC ? Math.round(((operating.current / salesC) * 100) * 10) / 10 : null,
    netMargin: Math.round(((net.current / salesC) * 100) * 10) / 10,
    roe: Math.round(((net.current / equityRow.current) * 100) * 10) / 10,
    debtToEquity: Math.round(((debtRowNums.current ?? 0) / equityRow.current) * 100) / 100,
    profitYoy: net.prior && net.prior > 0 ? Math.round(((net.current - net.prior) / net.prior) * 100) : null,
    epsCurrent,
    epsPrior,
    salesTrend,
    epsTrend,
  };
}

export async function fetchCodalLetters(symbol: string, max = 30): Promise<CodalLetter[]> {
  const sym = symbol?.trim();
  if (!sym) return [];
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.t < TTL) return hit.data;

  const params = new URLSearchParams({
    Symbol: sym,
    LetterType: "-1",
    AuditorRef: "-1",
    PageNumber: "1",
    Audited: "true",
    NotAudited: "true",
    IsNotAudited: "false",
    Childs: "true",
    Mains: "true",
    Publisher: "false",
    CompanyState: "-1",
    ReportingType: "-1",
    Category: "-1",
    CompanyType: "-1",
    Consolidatable: "true",
    NotConsolidatable: "true",
    TracingNo: "-1",
    Length: "-1",
  });
  const res = await fetch(`https://search.codal.ir/api/search/v2/q?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Codal ${res.status}`);
  const json = (await res.json()) as {
    Letters: { TracingNo: number; Title: string; PublishDateTime: string; Url: string }[];
  };
  const letters: CodalLetter[] = (json.Letters ?? [])
    .filter((l) => l.Title && l.Url)
    .slice(0, max)
    .map((l) => {
      const { category, important } = classifyLetter(l.Title);
      return {
        tracingNo: l.TracingNo,
        title: l.Title.replace(/\s+/g, " ").trim(),
        publishDateTime: l.PublishDateTime ?? "",
        pubDate: persianDateToMs(l.PublishDateTime ?? ""),
        url: `https://www.codal.ir${l.Url}`,
        category,
        important,
      };
    });
  if (letters.length > 0) cache.set(sym, { t: Date.now(), data: letters });
  return letters;
}
