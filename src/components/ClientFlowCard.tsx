"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { faDate, faInt, faPrice, faSigned } from "@/lib/format";

interface ClientTypeRow {
  date: number;
  buyIVolume: number;
  buyNVolume: number;
  sellIVolume: number;
  sellNVolume: number;
  buyICount: number;
  sellICount: number;
}

interface FlowData {
  today: ClientTypeRow | null;
  history: ClientTypeRow[];
  todayDate: number;
}

/** کارت یک گروه: خرید/فروش/خالص + نوار جهت */
function GroupCard({
  emoji,
  title,
  buy,
  sell,
  buyers,
  sellers,
}: {
  emoji: string;
  title: string;
  buy: number;
  sell: number;
  buyers?: number;
  sellers?: number;
}) {
  const net = buy - sell;
  const maxSide = Math.max(buy, sell, 1);
  const buyW = (buy / maxSide) * 50;
  const sellW = (sell / maxSide) * 50;

  return (
    <div className="rounded-2xl border border-line/70 bg-surface-2/40 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-bold">
        {emoji} {title}
      </div>

      <div className="space-y-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-up font-semibold">🛒 خرید</span>
            <span className="num font-bold text-ink">{faPrice(buy)}</span>
          </div>
          <div className="h-2 w-full rounded bg-surface-2">
            <div className="h-full rounded bg-gradient-to-l from-up to-emerald-400" style={{ width: `${buyW}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-down font-semibold">🏃 فروش</span>
            <span className="num font-bold text-ink">{faPrice(sell)}</span>
          </div>
          <div className="h-2 w-full rounded bg-surface-2">
            <div className="h-full rounded bg-gradient-to-l from-down to-rose-400" style={{ width: `${sellW}%` }} />
          </div>
        </div>
        <div
          className={`num rounded-lg p-2 text-center text-xs font-black ${
            net >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
          }`}
        >
          خالص: {faSigned(net)}
          <span className="ms-1 font-medium opacity-80">{net >= 0 ? "(ورود)" : "(خروج)"}</span>
        </div>
        {buyers !== undefined && sellers !== undefined && buyers + sellers > 0 && (
          <div className="num text-center text-[9px] leading-4 text-muted">
            👤 {faInt(buyers)} نفر خریدن · {faInt(sellers)} نفر فروختن
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientFlowCard({ insCode, priceUp }: { insCode: string; priceUp: boolean }) {
  const [data, setData] = useState<FlowData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/flow`);
        const json = await res.json();
        if (alive && json.ok) setData(json.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [insCode]);

  if (!data)
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton mt-4 h-40 w-full" />
      </div>
    );

  const t = data.today;
  const yesterday = data.history[data.history.length - 1] ?? null;
  const hist = data.history.slice(-30);
  const maxNet = Math.max(...hist.map((h) => Math.abs(h.buyIVolume - h.sellIVolume)), 1);

  if (!t)
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
          <Users className="h-4 w-4 text-brand" />
          پول حقیقی و حقوقی
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">داده در دسترس نیست</p>
      </div>
    );

  const netI = t.buyIVolume - t.sellIVolume;
  const netN = t.buyNVolume - t.sellNVolume;
  const deltaI = yesterday ? netI - (yesterday.buyIVolume - yesterday.sellIVolume) : null;

  /* تعبیر ساده تاثیر — ترکیب جهت پول و جهت قیمت */
  const interpretI =
    netI >= 0 && priceUp
      ? "مردم پول آوردن و قیمت هم بالا رفت — تقاضای واقعی پشت سهمه 🟢"
      : netI >= 0 && !priceUp
        ? "مردم با وجود ریزش داشتن می‌خرن — شاید دارن از کف جمع می‌کنن 👀"
        : netI < 0 && priceUp
          ? "قیمت بالا رفته ولی مردم داشتن می‌فروشن — هوشیار باش، ممکنه توزیع باشه ⚠️"
          : "هم مردم می‌فروختن هم قیمت پایین بود — فشار فروش خرد بالاست 🔻";
  const interpretN =
    netN >= 0
      ? `سازمان‌ها (حقوقی) خالص ${(faPrice(Math.abs(netN)))} خریدن — نشانه اعتماد نهادی${netI < 0 ? " در برابر خروج مردم" : ""}`
      : `سازمان‌ها (حقوقی) خالص ${(faPrice(Math.abs(netN)))} فروختن${netI < 0 ? " — هم‌جهت با خروج مردم، زنگ خطر" : ""}`;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-4 w-4 text-brand" />
        <span className="text-xs font-bold text-muted">پول حقیقی و حقوقی</span>
        <span className="num ms-auto text-[10px] text-muted">{faDate(t.date)}</span>
      </div>

      {/* دو گروه مجزا */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <GroupCard
          emoji="🧑"
          title="حقیقی (مردم عادی)"
          buy={t.buyIVolume}
          sell={t.sellIVolume}
          buyers={t.buyICount}
          sellers={t.sellICount}
        />
        <GroupCard emoji="🏢" title="حقوقی (سازمان‌ها)" buy={t.buyNVolume} sell={t.sellNVolume} />
      </div>

      {/* تعبیر تاثیر */}
      <div className="mt-3 rounded-2xl border border-brand/25 bg-brand-soft/40 p-3.5">
        <div className="mb-1.5 text-[10px] font-bold text-brand">💡 یعنی چی؟</div>
        <ul className="space-y-1.5 text-[11px] leading-5">
          <li className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {interpretI}
          </li>
          <li className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {interpretN}
          </li>
          {deltaI !== null && Math.abs(deltaI) > 1000 && (
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              نسبت به روز قبل: پول حقیقی {deltaI > 0 ? "بهتر شد" : "بدتر شد"} ({faSigned(deltaI)})
            </li>
          )}
        </ul>
      </div>

      {/* روند ۳۰ روزه خالص حقیقی */}
      {hist.length > 3 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-muted">
            <span>روند خالص پول حقیقی — ۳۰ روز اخیر</span>
            <span className="font-normal">
              {faDate(hist[0].date)} تا {faDate(hist[hist.length - 1].date)}
            </span>
          </div>
          <div className="relative h-32 rounded-xl border border-line/70 bg-surface-2/40 p-3" dir="ltr">
            <div className="absolute inset-x-3 top-1/2 h-px bg-line" />
            <span className="absolute right-4 top-1.5 text-[9px] font-semibold text-up/80">ورود ↑</span>
            <span className="absolute right-4 bottom-1.5 text-[9px] font-semibold text-down/80">خروج ↓</span>
            <div className="flex h-full items-center gap-[3px]">
              {hist.map((h, i) => {
                const net = h.buyIVolume - h.sellIVolume;
                const heightPct = Math.max((Math.abs(net) / maxNet) * 46, 2);
                const isLast = i === hist.length - 1;
                return (
                  <div key={h.date} title={`${faDate(h.date)} — ${net >= 0 ? "ورود" : "خروج"} ${faPrice(Math.abs(net))}`} className="group relative h-full flex-1">
                    <div className="absolute inset-x-0 top-0 bottom-1/2 flex flex-col justify-end">
                      {net >= 0 && (
                        <div className={`w-full rounded-t-sm transition-colors ${isLast ? "bg-up" : "bg-up/60 group-hover:bg-up"}`} style={{ height: `${heightPct}%` }} />
                      )}
                    </div>
                    <div className="absolute inset-x-0 top-1/2 bottom-0">
                      {net < 0 && (
                        <div className={`w-full rounded-b-sm transition-colors ${isLast ? "bg-down" : "bg-down/60 group-hover:bg-down"}`} style={{ height: `${heightPct}%` }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
