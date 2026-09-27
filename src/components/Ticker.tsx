"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { faPct, faPrice } from "@/lib/format";
import type { MoversResponse } from "@/types/market";

/** نوار متحرک برترین‌های بازار — هاور = توقف */
export function Ticker() {
  const [data, setData] = useState<MoversResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market/movers");
        const json = await res.json();
        if (alive && json.ok) setData(json.data);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data) return null;

  const items = [
    ...data.gainers.slice(0, 6).map((g) => ({ ...g, up: true })),
    ...data.losers.slice(0, 6).map((g) => ({ ...g, up: false })),
    ...data.active.slice(0, 5).map((g) => ({ ...g, up: g.lastPct >= 0 })),
  ];
  if (items.length === 0) return null;
  const loop = [...items, ...items]; // برای حلقه بی‌درز

  return (
    <div className="glass overflow-hidden rounded-xl py-2" dir="ltr">
      <div className="animate-ticker flex w-max gap-6 px-4">
        {loop.map((it, i) => (
          <Link
            key={`${it.insCode}-${i}`}
            href={`/stock/${it.insCode}`}
            className="flex shrink-0 items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
          >
            <span className="font-bold text-ink">{it.symbol}</span>
            <span className="num text-muted">{faPrice(it.last)}</span>
            <span className={`num font-bold ${it.up ? "text-up" : "text-down"}`}>{faPct(it.lastPct)}</span>
            <span className="text-line">•</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
