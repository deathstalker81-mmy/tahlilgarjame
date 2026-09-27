export interface NewsItem {
  title: string;
  link: string;
  pubDate: number;
  source: string;
  description: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function cdata(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return stripTags(m ? m[1] : s);
}

/** لینک واقعی مقصد را از ریدایرکت Bing بیرون می‌کشد */
function realLink(raw: string): string {
  const link = decodeEntities(raw);
  const m = link.match(/[?&]url=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return link;
    }
  }
  return link;
}

const DATE_TITLE = /^[\d۰-۹\s/]+\s*-\s*[\d:۰-۹]+\s*$/;

async function bingNews(query: string, max = 15): Promise<NewsItem[]> {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=RSS&setLang=fa`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fa,en;q=0.8" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Bing ${res.status}`);
  const xml = await res.text();
  const out: NewsItem[] = [];
  for (const b of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    let title = cdata(b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const rawLink = b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "";
    const pub = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const desc = cdata(b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    const source = cdata(b.match(/<News:Source>([\s\S]*?)<\/News:Source>/)?.[1] ?? "منبع");
    // در خبرهای زنده، عنوان همان تاریخ است — از توضیح استفاده می‌کنیم
    if (DATE_TITLE.test(title) && desc) title = desc.slice(0, 90);
    if (!title || !rawLink) continue;
    out.push({
      title,
      link: realLink(rawLink),
      pubDate: pub ? new Date(pub.trim()).getTime() || 0 : 0,
      source,
      description: desc.slice(0, 300),
    });
  }
  return out.slice(0, max);
}

/** فید مستقیم رسانه‌ها (مکمل) */
async function directFeed(url: string, fallbackSource: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${fallbackSource} ${res.status}`);
  const xml = await res.text();
  const out: NewsItem[] = [];
  for (const b of xml.match(/<item[\s\S]*?<\/item>/g) ?? []) {
    const title = cdata(b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const link = cdata(b.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
    const pub = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
    const desc = cdata(b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    if (!title || !link) continue;
    out.push({
      title,
      link: realLink(link),
      pubDate: pub ? new Date(pub.trim()).getTime() || 0 : 0,
      source: fallbackSource,
      description: desc.slice(0, 300),
    });
  }
  return out;
}

const MARKET_QUERIES = [
  "بورس تهران",
  "بازار سرمایه بورس",
  "شاخص کل بورس",
  "دلار ارز بازار",
  "طلا سکه بازار",
];

const cache = new Map<string, { t: number; data: NewsItem[] }>();

async function cached(key: string, ttl: number, loader: () => Promise<NewsItem[]>): Promise<NewsItem[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.data;
  const data = await loader();
  if (data.length > 0) cache.set(key, { t: Date.now(), data });
  return data;
}

function mergeDedupe(lists: NewsItem[][], maxAgeMs: number, cap: number, priorityLists: NewsItem[][] = []): NewsItem[] {
  const seen = new Set<string>();
  const keep = (n: NewsItem) => {
    const key = n.title.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const sortByDate = (a: NewsItem, b: NewsItem) => b.pubDate - a.pubDate;
  const priority = priorityLists
    .flat()
    .filter((n) => n.pubDate === 0 || Date.now() - n.pubDate < maxAgeMs)
    .filter(keep)
    .sort(sortByDate);
  const rest = lists
    .flat()
    .filter((n) => n.pubDate === 0 || Date.now() - n.pubDate < maxAgeMs)
    .filter(keep)
    .sort(sortByDate);
  return [...priority, ...rest].slice(0, cap);
}

/** اخبار روز بازار سرمایه — کوئری‌های بورسی Bing در اولویت + فید مستقیم رسانه‌ها */
export async function fetchMarketNews(): Promise<NewsItem[]> {
  return cached("market", 10 * 60 * 1000, async () => {
    const results = await Promise.allSettled([
      ...MARKET_QUERIES.map((q) => bingNews(q, 12)),
      directFeed("https://www.eghtesadonline.com/rss", "اقتصاد آنلاین"),
      directFeed("https://donya-e-eqtesad.com/rss", "دنیای اقتصاد"),
    ]);
    const get = (i: number) => (results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<NewsItem[]>).value : []);
    const bingLists = results.slice(0, MARKET_QUERIES.length).map((_, i) => get(i));
    const feedLists = [get(MARKET_QUERIES.length), get(MARKET_QUERIES.length + 1)];
    return mergeDedupe(feedLists, 72 * 60 * 60 * 1000, 90, bingLists);
  });
}

/** اخبار مرتبط با یک نماد مشخص */
export async function fetchSymbolNews(symbol: string, companyName: string): Promise<NewsItem[]> {
  const query = companyName?.trim() || symbol?.trim() || "";
  if (!query) return [];
  return cached(`sym:${query}`, 10 * 60 * 1000, async () => {
    const results = await Promise.allSettled([
      bingNews(query, 15),
      symbol.trim() && symbol.trim() !== query ? bingNews(symbol.trim(), 10) : Promise.resolve([]),
    ]);
    return mergeDedupe(results.map((r) => (r.status === "fulfilled" ? r.value : [])), 14 * 24 * 60 * 60 * 1000, 30);
  });
}
