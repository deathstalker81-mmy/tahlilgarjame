"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Flame, Loader2, Star, TrendingUp } from "lucide-react";
import type { MoversResponse, MoverRow } from "@/types/market";
import { faPct, faPrice } from "@/lib/format";
import { StarButton } from "./StarButton";

type TabKey = "gainers" | "losers" | "active";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "gainers", label: "بیشترین رشد", icon: <ArrowUpRight className="h-4 w-4" /> },
  { key: "losers", label: "کمترین رشد (ریزش)", icon: <ArrowDownLeft className="h-4 w-4" /> },
  { key: "active", label: "بیشترین حجم", icon: <Flame className="h-4 w-4" /> },
];

const groups: { key: string; label: string; match: (t: string) => boolean; chip: string; strip: string }[] = [
  { key: "sahm", label: "سهام", match: (t) => t === "سهم", chip: "from-indigo-500 to-blue-600", strip: "bg-brand" },
  { key: "fund", label: "صندوق‌ها", match: (t) => t === "صندوق سرمایه‌گذاری", chip: "from-violet-500 to-fuchsia-600", strip: "bg-violet-500" },
  { key: "oragh", label: "اوراق و مشتقات", match: (t) => t !== "سهم" && t !== "صندوق سرمایه‌گذاری", chip: "from-amber-500 to-orange-600", strip: "bg-gold" },
];

const groupOf = (t: string) => groups.find((g) => g.match(t))?.key ?? "oragh";

function GroupColumn({
  label,
  chip,
  strip,
  rows,
  showValue,
}: {
  label: string;
  chip: string;
  strip: string;
  rows: MoverRow[];
  showValue: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface-2/30">
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <div className={`h-2 w-2 rounded-full ${strip}`} />
        <span className="text-[11px] font-black text-ink">{label}</span>
        <span className="num ms-auto rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
          {rows.length.toLocaleString("fa-IR")} برتر
        </span>
      </div>
      <div className="divide-y divide-line/40">
        {rows.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[10px] text-muted/60">فعلا موردی نیست</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.insCode} className="group relative flex items-center gap-2 px-3 py-2 transition-colors hover:bg-brand-soft/30">
              <span className={`absolute inset-y-0 right-0 w-1 ${strip} opacity-60 group-hover:opacity-100`} />
              <span className="num w-4 text-center text-[9px] text-muted/60">{(i + 1).toLocaleString("fa-IR")}</span>
              <StarButton insCode={r.insCode} symbol={r.symbol} name={r.name} />
              <Link href={`/stock/${r.insCode}`} className="min-w-0 flex-1">
                <div className="text-xs font-black text-ink transition-colors group-hover:text-brand">{r.symbol}</div>
              </Link>
              <div className="text-left">
                {showValue ? (
                  <span className="num block text-[11px] font-bold text-muted">{faPrice(r.value / 1e12)} همت</span>
                ) : (
                  <span className="num block text-[11px] text-muted">{faPrice(r.last)}</span>
                )}
              </div>
              <span className={`shrink-0 ${r.lastPct >= 0 ? "pill-up" : "pill-down"}`}>{faPct(r.lastPct)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function MoversTabs() {
  const [tab, setTab] = useState<TabKey>("gainers");
  const [data, setData] = useState<MoversResponse | null>(null);
  const [error, setError] = useState<boolean | null>(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market/movers");
        const json = await res.json();
        if (alive && json.ok) {
          setData(json.data);
          setError(null);
        } else if (alive) setError(true);
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const t = setInterval(load, 20000);
    let retry: ReturnType<typeof setTimeout> | null = null;
    if (error) retry = setTimeout(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
      if (retry) clearTimeout(retry);
    };
  }, [error]);

  const allRows = data?.[tab] ?? [];

  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              tab === t.key
                ? "bg-brand-soft text-brand shadow-card"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        <span className="ms-auto flex items-center gap-1.5 text-[11px] text-muted">
          {error ? (
            data ? (
              "دیتای قبلی — در حال تلاش مجدد…"
            ) : (
              "منبع داده در دسترس نیست — تلاش مجدد…"
            )
          ) : (
            <>
              <span className="relative flex h-2 w-2 text-up">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-up" />
              </span>
              لحظه‌ای
            </>
          )}
        </span>
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupColumn
              key={g.key}
              label={g.label}
              chip={g.chip}
              strip={g.strip}
              rows={allRows.filter((r) => g.match(r.type)).slice(0, 5)}
              showValue={tab === "active"}
            />
          ))}
        </div>
      )}
    </section>
  );
}
