"use client";

import { useEffect, useState } from "react";
import { Factory, Loader2 } from "lucide-react";
import { faPct } from "@/lib/format";

interface Sector {
  name: string;
  pct: number;
}

function SectorBar({ s, maxAbs, side }: { s: Sector; maxAbs: number; side: "up" | "down" }) {
  const w = Math.max((Math.abs(s.pct) / maxAbs) * 100, 4);
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <span className="w-28 shrink-0 truncate text-[10px] font-semibold text-ink">{s.name}</span>
      <div className="h-5 flex-1 rounded-md bg-surface-2/60">
        <div
          className={`flex h-full items-center justify-end rounded-md px-1.5 transition-all duration-700 ${
            side === "up" ? "bg-gradient-to-l from-up/70 to-emerald-400/50" : "bg-gradient-to-l from-down/70 to-rose-400/50"
          }`}
          style={{ width: `${Math.min(w, 100)}%` }}
        >
          <span className="num text-[9px] font-black text-white">{faPct(s.pct)}</span>
        </div>
      </div>
    </div>
  );
}

export function MarketSectors() {
  const [data, setData] = useState<{ best: Sector[]; worst: Sector[] } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market/sectors");
        const json = await res.json();
        if (alive && json.ok) setData(json.data);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data)
    return (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold sm:text-base">
          <Factory className="h-4 w-4 text-brand" /> صنعت‌های امروز
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="skeleton h-48" />
          <div className="skeleton h-48" />
        </div>
      </section>
    );

  const maxAbs = Math.max(...data.best.map((s) => Math.abs(s.pct)), ...data.worst.map((s) => Math.abs(s.pct)), 0.1);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <Factory className="h-4 w-4 text-brand" /> صنعت‌های امروز
          <span className="text-[10px] font-normal text-muted">— کدام صنعت‌ها راننده بازار بودند؟</span>
        </h2>
        <span className="num flex items-center gap-1 text-[9px] text-muted">
          <Loader2 className="h-3 w-3" /> هر دقیقه
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="mb-3 text-[11px] font-black text-up">🚀 برترین صنعت‌ها</div>
          <div className="space-y-2">
            {data.best.map((s) => (
              <SectorBar key={s.name} s={s} maxAbs={maxAbs} side="up" />
            ))}
          </div>
        </div>
        <div className="card p-4">
          <div className="mb-3 text-[11px] font-black text-down">🩸 ضعیف‌ترین صنعت‌ها</div>
          <div className="space-y-2">
            {data.worst.map((s) => (
              <SectorBar key={s.name} s={s} maxAbs={maxAbs} side="down" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
