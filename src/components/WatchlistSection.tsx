"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Eye, SortAsc, SortDesc, Star } from "lucide-react";
import { getWatchlist, onWatchlistChange, removeFromWatchlist, type WatchItem } from "@/lib/watchlist";
import { faPct, faPrice } from "@/lib/format";
import { useFlashClass } from "@/hooks/anim";

interface QuoteRow {
  insCode: string;
  symbol: string;
  name: string;
  last: number;
  lastPct: number;
  closingPct: number;
  closing: number;
}

/** ردیف بلیتی با نوار رنگی کناری و قیمت درشت */
function WatchRow({ item, quote }: { item: WatchItem; quote: QuoteRow | null }) {
  const flash = useFlashClass(quote?.last ?? 0);
  const pct = quote?.lastPct ?? 0;
  const up = pct >= 0;

  return (
    <Link
      href={`/stock/${item.insCode}`}
      className={`group flex items-center gap-3 border-e-4 px-4 py-3 transition-all hover:bg-brand-soft/30 ${
        quote ? (up ? "border-up/60 bg-up/[0.03]" : "border-down/60 bg-down/[0.03]") : "border-line/40"
      }`}
    >
      {/* ستاره حذف */}
      <button
        aria-label="حذف از دیده‌بان"
        title="حذف"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          removeFromWatchlist(item.insCode);
        }}
        className="shrink-0 text-gold/70 transition-all hover:scale-125 hover:text-down"
      >
        <Star className="h-4 w-4" fill="currentColor" />
      </button>

      {/* نماد */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-ink transition-colors group-hover:text-brand">{item.symbol}</div>
        <div className="max-w-40 truncate text-[9px] text-muted">{item.name}</div>
      </div>

      {/* قیمت درشت + فلش زنده */}
      {quote ? (
        <div className="text-left">
          <span
            key={flash.key}
            className={`num inline-block rounded-md px-2 py-0.5 text-lg font-black tabular-nums ${flash.cls} ${up ? "text-up" : "text-down"}`}
          >
            {faPrice(quote.last)}
          </span>
          <div className="num text-[8px] text-muted/70">پایانی: {faPrice(quote.closing)}</div>
        </div>
      ) : (
        <span className="num text-lg text-muted">…</span>
      )}

      {/* درصد */}
      {quote ? (
        <span className={`flex shrink-0 items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-xs font-black ${up ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
          {faPct(pct)}
        </span>
      ) : (
        <span className="h-6 w-14 animate-pulse rounded-xl bg-surface-2" />
      )}
    </Link>
  );
}

export function WatchlistSection() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [quotes, setQuotes] = useState<Map<string, QuoteRow>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [sortKey, setSortKey] = useState<"default" | "desc" | "asc">("default");

  useEffect(() => {
    const load = () => setItems(getWatchlist());
    load();
    setMounted(true);
    return onWatchlistChange(load);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    let alive = true;
    const load = async () => {
      try {
        const codes = items.map((i) => i.insCode).join(",");
        const res = await fetch(`/api/market/quotes?codes=${codes}`);
        const json = await res.json();
        if (alive && json.ok) {
          const m = new Map<string, QuoteRow>();
          for (const q of json.data.quotes) m.set(q.insCode, q);
          setQuotes(m);
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [items]);

  const sorted = useMemo(() => {
    const withQ = items.map((item) => ({ item, q: quotes.get(item.insCode) ?? null }));
    if (sortKey === "default") return withQ;
    return withQ.sort((a, b) => {
      const pa = a.q?.lastPct ?? 0;
      const pb = b.q?.lastPct ?? 0;
      return sortKey === "desc" ? pb - pa : pa - pb;
    });
  }, [items, quotes, sortKey]);

  if (!mounted) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <Eye className="h-4 w-4 text-brand" /> دیده‌بان من
        </h2>
        {items.length > 0 && (
          <span className="num rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
            {items.length.toLocaleString("fa-IR")} نماد
          </span>
        )}
        {items.length > 1 && (
          <button
            onClick={() => setSortKey((s) => (s === "default" ? "desc" : s === "desc" ? "asc" : "default"))}
            className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[10px] font-semibold text-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            {sortKey === "default" ? (
              "ترتیب افزودن"
            ) : sortKey === "desc" ? (
              <><SortDesc className="h-3 w-3" /> بیشترین رشد</>
            ) : (
              <><SortAsc className="h-3 w-3" /> بیشترین ریزش</>
            )}
          </button>
        )}
        {items.length > 0 && (
          <span className="ms-auto flex items-center gap-1.5 text-[10px] text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
            </span>
            زنده
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-line bg-surface-2/30 flex flex-col items-center gap-2 p-8 text-center">
          <Star className="h-7 w-7 text-muted/40" />
          <p className="text-xs leading-6 text-muted">
            هنوز نمادی اضافه نکردی — روی
            <Star className="mx-1 inline h-3 w-3 text-gold" />
            نمادها در جدول‌ها و جستجو بزن تا اینجا زنده پایشان کنی
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line shadow-glass">
          {/* نوار هدر گرادیانی — امضای پنل */}
          <div className="flex items-center gap-2 bg-gradient-to-l from-brand/20 via-brand-soft/50 to-transparent px-4 py-2.5">
            <span className="text-[10px] font-black tracking-wide text-brand">👁 پایش زنده</span>
            <span className="text-[9px] text-muted">قیمت‌ها هر ۲۰ ثانیه تازه می‌شوند</span>
          </div>
          <div className="divide-y divide-line/40 bg-surface-2/50">
            {sorted.map(({ item, q }) => (
              <WatchRow key={item.insCode} item={item} quote={q} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
