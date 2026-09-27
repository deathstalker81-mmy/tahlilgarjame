"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Factory, Scale } from "lucide-react";
import { faPct, faPrice, faVolume } from "@/lib/format";

interface PeerRow {
  insCode: string;
  symbol: string;
  name: string;
  pct: number;
  price: number;
  pe: number | null;
  value: number;
  self: boolean;
}

interface Stats {
  avgPct: number;
  up: number;
  down: number;
  selfRank: number | null;
  total: number;
}

export function PeersCard({
  insCode,
  sectorName,
}: {
  insCode: string;
  sectorName: string | null;
}) {
  const [data, setData] = useState<{ peers: PeerRow[]; stats: Stats | null; sector: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/stock/${insCode}/peers`);
        const json = await res.json();
        if (alive && json.ok) setData({ peers: json.data.peers, stats: json.data.stats, sector: json.data.sectorName });
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
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-3 h-32 w-full" />
      </div>
    );

  if (data.peers.length < 2) return null;
  const s = data.stats;

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
        <Factory className="h-4 w-4 text-brand" />
        هم‌گروهی‌ها {data.sector ? `— گروه ${data.sector}` : ""}
      </div>

      {/* آمار گروه */}
      {s && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line/70 bg-surface-2/40 p-2.5 text-center">
            <div className="text-[9px] text-muted">میانگین گروه امروز</div>
            <div className="num mt-0.5 text-sm font-black">
              <span className={s.avgPct >= 0 ? "text-up" : "text-down"}>{faPct(s.avgPct)}</span>
            </div>
          </div>
          <div className="rounded-xl border border-line/70 bg-surface-2/40 p-2.5 text-center">
            <div className="text-[9px] text-muted">فضای گروه</div>
            <div className="num mt-0.5 text-sm font-black">
              <span className="text-up">{s.up.toLocaleString("fa-IR")}</span>
              <span className="text-muted"> سبز / </span>
              <span className="text-down">{s.down.toLocaleString("fa-IR")}</span>
              <span className="text-muted"> قرمز</span>
            </div>
          </div>
          <div className="rounded-xl border border-line/70 bg-surface-2/40 p-2.5 text-center">
            <div className="text-[9px] text-muted">رتبه این سهم (امروز)</div>
            <div className="num mt-0.5 text-sm font-black text-brand">
              {s.selfRank ? `${s.selfRank.toLocaleString("fa-IR")} از ${s.total.toLocaleString("fa-IR")}` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* جدول مقایسه */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="text-[10px] text-muted">
              <th className="px-2 py-2 text-right font-medium">نماد</th>
              <th className="px-2 py-2 text-center font-medium">قیمت</th>
              <th className="px-2 py-2 text-center font-medium">امروز</th>
              <th className="px-2 py-2 text-center font-medium">P/E</th>
              <th className="px-2 py-2 text-center font-medium">ارزش معاملات</th>
              <th className="px-2 py-2 text-center font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {data.peers.map((p) => (
              <tr
                key={p.insCode}
                className={`border-t border-line/50 ${p.self ? "bg-brand-soft/60 font-bold" : "hover:bg-surface-2/40"}`}
              >
                <td className="px-2 py-2 text-right">
                  <span className={p.self ? "text-brand" : "text-ink"}>{p.symbol}</span>
                  {p.self && <span className="ms-1 text-[9px] text-brand">← همین سهم</span>}
                </td>
                <td className="num px-2 py-2 text-center">{faPrice(p.price)}</td>
                <td className="px-2 py-2 text-center">
                  <span className={p.pct >= 0 ? "pill-up" : "pill-down"}>{faPct(p.pct)}</span>
                </td>
                <td className="num px-2 py-2 text-center text-muted">{p.pe ? faPrice(p.pe) : "—"}</td>
                <td className="num px-2 py-2 text-center text-muted">{faVolume(p.value)}</td>
                <td className="px-2 py-2 text-center">
                  {!p.self && (
                    <Link
                      href={`/compare?codes=${insCode},${p.insCode}`}
                      title="مقایسه با این نماد"
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[9px] text-muted transition-colors hover:border-brand/50 hover:text-brand"
                    >
                      <Scale className="h-3 w-3" /> مقایسه
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[9px] text-muted/70">مرتب بر اساس ارزش معاملات — P/E کمتر یعنی ارزون‌تر نسبت به سودش</p>
    </div>
  );
}
