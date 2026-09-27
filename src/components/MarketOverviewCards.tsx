"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, BarChart3, Coins, RefreshCw } from "lucide-react";
import type { MarketOverview } from "@/types/market";
import { faCompactRial, faDate, faInt, faPct, faTime } from "@/lib/format";
import { useCountUp } from "@/hooks/anim";

function usePoll<T>(url: string, intervalMs: number, refreshKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<"server" | "source" | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url);
        const json = await res.json();
        if (alive && json.ok) {
          setData(json.data);
          setError(null);
        } else if (alive) setError("source");
      } catch {
        if (alive) setError("server");
      }
    };
    load();
    const t = setInterval(load, intervalMs);
    /* تلاش مجدد خودکار بعد از خطا */
    let retry: ReturnType<typeof setTimeout> | null = null;
    if (error) retry = setTimeout(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
      if (retry) clearTimeout(retry);
    };
  }, [url, intervalMs, refreshKey, error]);
  return { data, error };
}

function ChangePill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span className={up ? "pill-up" : "pill-down"}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
      {faPct(v)}
    </span>
  );
}

function IndexCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton h-4 w-20" />
      <div className="skeleton mt-4 h-8 w-36" />
      <div className="skeleton mt-3 h-4 w-16" />
    </div>
  );
}

export function MarketOverviewCards() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [clockNow, setClockNow] = useState<Date | null>(null);
  useEffect(() => {
    setClockNow(new Date());
    const t = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const { data, error } = usePoll<MarketOverview>("/api/market/overview", 15000, refreshKey);

  /* هوک‌های شمارش نرم — قبل از هر return شرطی (قانون React) */
  const indexTarget = data?.indexLastValue ?? 0;
  const eqwTarget = data?.indexEqualWeightedLastValue ?? 0;
  const indexAnimated = useCountUp(indexTarget);
  const eqwAnimated = useCountUp(eqwTarget);

  if (error && !data)
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-right">
        <div>
          <p className="text-sm font-semibold">
            {error === "server" ? "سرور اپلیکیشن در دسترس نیست" : "منبع داده بازار موقتاً در دسترس نیست"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {error === "server"
              ? "در پوشه پروژه، سرور را اجرا کن: npm run start"
              : "سرور در حال تلاش مجدد است — چند لحظه صبر کن"}
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="sm:ms-auto flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition-transform active:scale-95"
        >
          <RefreshCw className="h-4 w-4" /> تلاش مجدد
        </button>
      </div>
    );

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <IndexCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const isOpen = data.marketState === "S";
  /* تعطیلات کامل هفتگی: پنجشنبه و جمعه به وقت تهران */
  const tehranDay = clockNow ? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Tehran" }).format(clockNow) : "";
  const isClosedDay = tehranDay === "Thursday" || tehranDay === "Friday";
  /* تغییر درصدی واقعی: تغییر واحدی ÷ شاخص پایه */
  const indexPct = (data.indexChange / (data.indexLastValue - data.indexChange)) * 100;
  const eqwPct = (data.indexEqualWeightedChange / (data.indexEqualWeightedLastValue - data.indexEqualWeightedChange)) * 100;
  const cards = [
    {
      title: "شاخص کل",
      chip: "from-indigo-500 to-blue-600",
      icon: <Activity className="h-5 w-5 text-white" />,
      value: faInt(indexAnimated),
      pill: <ChangePill v={indexPct} />,
      sub: `${faInt(Math.abs(data.indexChange))} ${data.indexChange >= 0 ? "واحد بالا" : "واحد پایین"}`,
    },
    {
      title: "شاخص هم‌وزن",
      chip: "from-violet-500 to-fuchsia-600",
      icon: <BarChart3 className="h-5 w-5 text-white" />,
      value: faInt(eqwAnimated),
      pill: <ChangePill v={eqwPct} />,
      sub: `${faInt(Math.abs(data.indexEqualWeightedChange))} ${data.indexEqualWeightedChange >= 0 ? "واحد بالا" : "واحد پایین"}`,
    },
    {
      title: "ارزش معاملات",
      chip: "from-amber-500 to-orange-600",
      icon: <Coins className="h-5 w-5 text-white" />,
      value: faCompactRial(data.marketActivityQTotCap),
      pill: null,
      sub: `${faInt(data.marketActivityZTotTran)} معامله`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div key={c.title} className="card animate-fade-up group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-card ${c.chip} transition-transform duration-300 group-hover:scale-110`}>
              {c.icon}
            </div>
            <span className="text-xs font-bold text-muted">{c.title}</span>
          </div>
          <div className="num grad-num mt-3.5 text-[26px] font-black leading-8 tracking-tight">{c.value}</div>
          <div className="mt-2 flex items-center justify-between">
            {c.pill ?? <span />}
            <span className="text-[11px] text-muted">{c.sub}</span>
          </div>
        </div>
      ))}

      <div
        className={`card animate-fade-up p-5 ${isOpen ? "border-up/40" : "border-gold/40"}`}
        style={{
          background: isOpen
            ? "linear-gradient(135deg, rgba(34,197,94,0.08), var(--surface))"
            : "linear-gradient(135deg, rgba(245,158,11,0.08), var(--surface))",
        }}
      >
        <div className="flex items-center gap-2 text-muted">
          <span className={`relative flex h-2.5 w-2.5 ${isOpen ? "text-up" : "text-gold"}`}>
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                isOpen ? "bg-up" : "bg-gold"
              }`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isOpen ? "bg-up" : "bg-gold"}`} />
          </span>
          <span className="text-xs font-medium">وضعیت بازار</span>
          <span className="num ms-auto text-[11px] font-black text-brand" dir="ltr">
            {clockNow ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Tehran" }).format(clockNow) : ""}
          </span>
        </div>

        <div className="mt-3 text-2xl font-black">
          {isOpen && !isClosedDay ? (
            <span className="text-up">بازار باز است</span>
          ) : isClosedDay ? (
            <span className="text-down">بازار تعطیل است</span>
          ) : (
            <span className="text-gold">{data.marketStateTitle || "بسته"}</span>
          )}
        </div>

        {/* پیشرفت جلسه */}
        {(() => {
          if (!clockNow) return null;
          if (isClosedDay) {
            return (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full w-0 rounded-full bg-muted/40" />
                </div>
                <div className="mt-1.5 text-[9px] text-muted">🔴 پنجشنبه و جمعه تعطیل — جلسه بعدی: شنبه ۹:۰۰ صبح</div>
              </div>
            );
          }
          const tehran = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(clockNow);
          const [hh, mm] = tehran.split(":").map(Number);
          const mins = hh * 60 + mm;
          const OPEN = 9 * 60;
          const CLOSE = 12 * 60 + 30;
          let pct = 0;
          let label = "";
          if (mins < OPEN) { pct = 0; label = "⏰ شروع جلسه: ۹:۰۰ صبح"; }
          else if (mins <= CLOSE) { pct = ((mins - OPEN) / (CLOSE - OPEN)) * 100; label = "⏳ پایان جلسه: ۱۲:۳۰"; }
          else { pct = 100; label = "✔ جلسه امروز تمام شد"; }
          return (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${isOpen ? "bg-gradient-to-l from-up to-emerald-400" : pct >= 100 ? "bg-muted/60" : "bg-gold/60"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted">
                <span>{label}</span>
                {faDate(data.marketActivityDEven) !== "—" && <span className="num">{faDate(data.marketActivityDEven)}</span>}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
