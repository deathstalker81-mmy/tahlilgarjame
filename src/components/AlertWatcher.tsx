"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, FileText, X } from "lucide-react";
import { getAlerts, markTriggered, onAlertsChange, type PriceAlert } from "@/lib/alerts";
import { getWatchlist } from "@/lib/watchlist";
import { faPrice } from "@/lib/format";

interface Toast {
  id: string;
  title: string;
  body: string;
  link?: string;
}

const SEEN_KEY = "tj-codal-seen";

function getSeen(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setSeen(seen: Record<string, number[]>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

function fireToasts(setToasts: (f: (t: Toast[]) => Toast[]) => void, toasts: Toast[]) {
  setToasts((t) => [...toasts, ...t].slice(0, 4));
  for (const toast of toasts) {
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== toast.id)), 12000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(toast.title, { body: toast.body });
    }
  }
}

export function AlertWatcher() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const alertsRef = useRef<PriceAlert[]>([]);

  useEffect(() => {
    const load = () => {
      alertsRef.current = getAlerts();
    };
    load();

    let alive = true;
    const check = async () => {
      const pending = alertsRef.current.filter((a) => !a.triggeredAt);
      if (pending.length === 0) return;
      try {
        const codes = [...new Set(pending.map((a) => a.insCode))].join(",");
        const res = await fetch(`/api/market/quotes?codes=${codes}`);
        const json = await res.json();
        if (!alive || !json.ok) return;
        const prices = new Map<string, number>();
        for (const q of json.data.quotes) prices.set(q.insCode, q.last);
        for (const a of pending) {
          const last = prices.get(a.insCode);
          if (last === undefined) continue;
          const hit = a.direction === "up" ? last >= a.target : last <= a.target;
          if (hit) {
            markTriggered(a.id);
            const toast: Toast = {
              id: a.id,
              title: `🔔 هشدار ${a.symbol}`,
              body: `قیمت به ${faPrice(last)} رسید (هدف: ${faPrice(a.target)})`,
            };
            setToasts((t) => [toast, ...t].slice(0, 4));
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 12000);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(toast.title, { body: toast.body });
            }
          }
        }
      } catch {
        /* ignore */
      }
    };

    check();
    const t = setInterval(check, 30000);

    /* ===== مراقبت زنده کدال برای دیده‌بان ===== */
    const checkCodal = async () => {
      const watch = getWatchlist();
      if (watch.length === 0) return;
      const symbols = watch.map((w) => w.symbol).join(",");
      try {
        const res = await fetch(`/api/market/codal-check?symbols=${encodeURIComponent(symbols)}`);
        const json = await res.json();
        if (!alive || !json.ok) return;
        const seen = getSeen();
        const newToasts: Toast[] = [];
        let changed = false;
        for (const [sym, letters] of Object.entries(json.data.bySymbol as Record<string, { tracingNo: number; title: string; url: string; pubDate: number; category: string; important: boolean }[]>)) {
          if (!Array.isArray(letters) || letters.length === 0) continue;
          if (!seen[sym]) {
            /* اولین اجرا: فقط علامت‌گذاری، بدون اسپم */
            seen[sym] = letters.map((l) => l.tracingNo).slice(0, 8);
            changed = true;
            continue;
          }
          const fresh = letters.filter((l) => !seen[sym].includes(l.tracingNo) && Date.now() - l.pubDate < 48 * 3600 * 1000);
          for (const l of fresh) {
            newToasts.push({
              id: `codal-${l.tracingNo}`,
              title: `📄 کدال ${sym}${l.important ? " ⭐" : ""}`,
              body: `${l.title}`,
              link: l.url,
            });
          }
          if (fresh.length > 0) {
            seen[sym] = [...fresh.map((l) => l.tracingNo), ...seen[sym]].slice(0, 30);
            changed = true;
          }
        }
        if (changed) setSeen(seen);
        if (newToasts.length > 0) fireToasts(setToasts, newToasts.slice(0, 3));
      } catch {
        /* ignore */
      }
    };

    checkCodal();
    const tCodal = setInterval(checkCodal, 5 * 60 * 1000);

    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(tCodal);
    };
  }, []);

  useEffect(() => {
    const unsub = onAlertsChange(() => {
      alertsRef.current = getAlerts();
    });
    return unsub;
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-[60] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className="card animate-fade-up relative flex items-start gap-3 p-4 pe-10" style={{ minWidth: 280 }}>
          {t.link ? (
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          ) : (
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          )}
          <div>
            <div className="text-xs font-bold">{t.title}</div>
            <div className="mt-0.5 text-[11px] leading-5 text-muted">{t.body}</div>
            {t.link && (
              <a href={t.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[10px] font-semibold text-brand hover:underline">
                مشاهده اطلاعیه در کدال →
              </a>
            )}
          </div>
          <button
            aria-label="بستن"
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            className="absolute left-2 top-2 text-muted/60 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
