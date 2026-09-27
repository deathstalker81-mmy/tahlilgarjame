"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, TrendingUp } from "lucide-react";
import type { SearchResult } from "@/types/market";
import { StarButton } from "./StarButton";

export function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.ok ? json.data : []);
        setOpen(true);
        setActiveIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    router.push(`/stock/${r.insCode}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && activeIdx >= 0) {
      go(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2/70 px-4 py-2.5 transition-colors focus-within:border-brand/60 focus-within:bg-surface-2">
        <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="جستجوی نماد… (مثلاً فولاد، وبملت، شپنا)"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted" />}
      </div>

      {open && (
        <div className="card absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted">
              {loading ? "در حال جستجو…" : "نتیجه‌ای پیدا نشد"}
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.insCode}
                onClick={() => go(r)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-colors ${
                  i === activeIdx ? "bg-brand-soft" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{r.symbol}</div>
                  <div className="truncate text-xs text-muted">{r.name}</div>
                </div>
                <StarButton insCode={r.insCode} symbol={r.symbol} name={r.name} />
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    {r.type}
                  </span>
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted">
                    {r.flow === 1 ? "بورس" : "فرابورس"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
