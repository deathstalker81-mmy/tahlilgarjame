"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Scale, Search, Sparkles, X } from "lucide-react";
import { faPct, faPrice, faVolume } from "@/lib/format";
import type { SearchResult } from "@/types/market";

interface CompareRow {
  insCode: string;
  symbol: string;
  name: string;
  type: string;
  price: number;
  lastPct: number;
  eps: number | null;
  pe: number | null;
  sectorPE: number | null;
  sectorName: string | null;
  rsi: number | null;
  maState: string;
  stoch: { k: number; d: number } | null;
  mfi: number | null;
  monthPct: number | null;
  quarterPct: number | null;
  fromYearHighPct: number | null;
  volRatio: number | null;
  volume: number;
}

function SymbolPicker({ onPick }: { onPick: (r: SearchResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.ok) {
          setResults(json.data);
          setOpen(true);
        }
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative flex-1">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2/70 px-3 py-2.5">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="افزودن نماد…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
      </div>
      {open && results.length > 0 && (
        <div className="card absolute inset-x-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto p-1.5">
          {results.map((r) => (
            <button
              key={r.insCode}
              onClick={() => {
                onPick(r);
                setQ("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right hover:bg-brand-soft"
            >
              <span className="text-sm font-bold text-brand">{r.symbol}</span>
              <span className="truncate text-[11px] text-muted">{r.name}</span>
              <span className="ms-auto text-[9px] text-muted">{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompareView() {
  const searchParams = useSearchParams();
  const [picked, setPicked] = useState<SearchResult[]>([]);
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<{ winner: string; reasons: string[]; verdict: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /* اگر از دکمه «مقایسه» آمده باشد: ?codes=a,b */
  useEffect(() => {
    const fromUrl = (searchParams.get("codes") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (fromUrl.length >= 2) {
      setPicked(fromUrl.map((c) => ({ insCode: c, symbol: "…", name: "", flow: 1, type: "" })));
    }
  }, [searchParams]);

  const codes = picked.map((p) => p.insCode).join(",");

  const load = useCallback(async () => {
    if (picked.length < 2) return;
    setLoading(true);
    setAi(null);
    try {
      const res = await fetch(`/api/compare?codes=${codes}`);
      const json = await res.json();
      if (json.ok) {
        setRows(json.data.rows);
        /* اصلاح نام نمادها بعد از دریافت داده */
        setPicked((prev) =>
          prev.map((p) => {
            const row = json.data.rows.find((r: CompareRow) => r.insCode === p.insCode);
            return row ? { ...p, symbol: row.symbol, name: row.name } : p;
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [codes, picked.length]);

  useEffect(() => {
    if (picked.length >= 2) load();
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps

  const askAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/compare/ai?codes=${codes}`);
      const json = await res.json();
      if (!json.ok) throw new Error("خطا");
      setAi(json.data);
    } catch {
      setAiError("خطا در تحلیل — دوباره تلاش کن");
    } finally {
      setAiLoading(false);
    }
  };

  const metric = (label: string, get: (r: CompareRow) => React.ReactNode, hint?: string) => ({ label, get, hint });

const metrics = [
    metric("نوع", (r) => r.type),
    metric("قیمت", (r) => faPrice(r.price)),
    metric("امروز", (r) => <span className={r.lastPct >= 0 ? "pill-up" : "pill-down"}>{faPct(r.lastPct)}</span>),
    metric("P/E سهم", (r) => (r.pe ? faPrice(r.pe) : "—")),
    metric("P/E صنعت", (r) => (r.sectorPE ? faPrice(r.sectorPE) : "—")),
    metric("RSI", (r) => (r.rsi !== null ? r.rsi?.toFixed(0) : "—")),
    metric("روند میانگین‌ها", (r) => (r.maState === "bull" ? "صعودی 🟢" : r.maState === "bear" ? "نزولی 🔴" : "خنثی")),
    metric("استوکاستیک K/D", (r) => (r.stoch ? `${r.stoch.k}/${r.stoch.d}` : "—")),
    metric("MFI (پول)", (r) => (r.mfi !== null ? r.mfi.toFixed(0) : "—")),
    metric("عملکرد ماه", (r) => (r.monthPct !== null ? faPct(r.monthPct) : "—")),
    metric("عملکرد فصل", (r) => (r.quarterPct !== null ? faPct(r.quarterPct) : "—")),
    metric("فاصله از سقف سال", (r) => (r.fromYearHighPct !== null ? faPct(r.fromYearHighPct) : "—")),
    metric("حجم امروز", (r) => faVolume(r.volume)),
    metric("لینک", (r) => (
      <Link href={`/stock/${r.insCode}`} className="text-[11px] font-bold text-brand hover:underline">
        تحلیل کامل →
      </Link>
    )),
  ];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Scale className="h-4 w-4 text-brand" /> مقایسه سهم‌ها
          <span className="text-[10px] font-normal text-muted">۲ تا ۳ نماد انتخاب کن</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {picked.map((p) => (
            <span key={p.insCode} className="flex items-center gap-1.5 rounded-xl bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand">
              {p.symbol}
              <button
                aria-label="حذف"
                onClick={() => setPicked((x) => x.filter((y) => y.insCode !== p.insCode))}
                className="text-brand/60 hover:text-down"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {picked.length < 3 && <SymbolPicker onPick={(r) => setPicked((x) => (x.some((y) => y.insCode === r.insCode) ? x : [...x, r]))} />}
        </div>
        {loading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال دریافت داده‌های زنده…
          </div>
        )}
      </div>

      {rows && rows.length >= 2 && (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-4 py-3 text-right font-medium">شاخص</th>
                  {rows.map((r) => (
                    <th key={r.insCode} className="px-4 py-3 text-center">
                      <div className="text-base font-black text-brand">{r.symbol}</div>
                      <div className="truncate text-[10px] font-normal">{r.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-b border-line/50 last:border-0">
                    <td className="px-4 py-2.5 text-xs text-muted">{m.label}</td>
                    {rows.map((r) => (
                      <td key={r.insCode} className="num px-4 py-2.5 text-center">
                        {m.get(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* تحلیل مقایسه‌ای AI */}
          {ai ? (
            <div className="card animate-fade-up p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-bold">نتیجه مقایسه: برنده — {ai.winner}</h3>
              </div>
              <ul className="mt-3 space-y-2">
                {ai.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-6">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {r}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-line/60 pt-3 text-xs leading-6 text-muted">{ai.verdict}</p>
            </div>
          ) : (
            <div className="card flex flex-wrap items-center gap-3 p-5">
              <Sparkles className="h-5 w-5 shrink-0 text-brand" />
              <p className="flex-1 text-xs text-muted">می‌خوای AI هم این مقایسه رو جمع‌بندی کنه؟</p>
              <button
                onClick={askAi}
                disabled={aiLoading}
                className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {aiLoading ? "در حال مقایسه…" : "تحلیل مقایسه‌ای AI"}
              </button>
              {aiError && <p className="w-full text-center text-[10px] text-down">{aiError}</p>}
            </div>
          )}
        </>
      )}

      {picked.length < 2 && (
        <div className="card p-10 text-center text-sm text-muted">
          حداقل ۲ نماد انتخاب کن تا جدول مقایسه و تحلیل AI ساخته بشه
        </div>
      )}
    </div>
  );
}
