"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";
import {
  addAlert,
  clearTriggered,
  getAlerts,
  onAlertsChange,
  removeAlert,
  type PriceAlert,
} from "@/lib/alerts";
import { faPrice } from "@/lib/format";

export function AlertButton({
  insCode,
  symbol,
  currentPrice,
}: {
  insCode: string;
  symbol: string;
  currentPrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setSaved(false);
  }, [open]);

  useEffect(() => {
    setTarget(String(Math.round(currentPrice * 1.03)));
  }, [currentPrice, open]);

  const save = () => {
    const t = Number(target.replace(/[^\d.]/g, ""));
    if (!t || t <= 0) return;
    addAlert(insCode, symbol, t, t >= currentPrice ? "up" : "down");
    setSaved(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setTimeout(() => setOpen(false), 1200);
  };

  const t = Number(target.replace(/[^\d.]/g, ""));
  const dir = t && currentPrice ? (t >= currentPrice ? "بالا" : "پایین") : null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
          open ? "border-brand/50 bg-brand-soft text-brand" : "border-line text-muted hover:text-ink"
        }`}
      >
        <Bell className="h-3.5 w-3.5" /> هشدار قیمت
      </button>

      {open && (
        <div className="card absolute end-0 top-full z-30 mt-2 w-72 p-4">
          <div className="mb-2 text-xs font-bold">هشدار برای {symbol}</div>
          <p className="mb-3 text-[11px] leading-5 text-muted">
            قیمت فعلی: <span className="num font-bold text-ink">{faPrice(currentPrice)}</span> — به محض رسیدن،
            اعلان می‌گیری.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              inputMode="numeric"
              placeholder="قیمت هدف"
              className="num w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand/60"
              dir="ltr"
            />
            {dir && (
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${dir === "بالا" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                رسیدن از {dir}
              </span>
            )}
          </div>
          <button
            onClick={save}
            className="mt-3 w-full rounded-lg bg-brand py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            {saved ? "✓ ثبت شد" : "ثبت هشدار"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AlertsBell() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => setAlerts(getAlerts());
    load();
    return onAlertsChange(load);
  }, []);

  const active = alerts.filter((a) => !a.triggeredAt);
  const triggered = alerts.filter((a) => a.triggeredAt);
  const unread = triggered.length;

  return (
    <div className="relative">
      <button
        aria-label="هشدارها"
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted transition-colors hover:text-ink"
      >
        {unread > 0 ? <BellRing className="h-[18px] w-[18px] text-gold" /> : <Bell className="h-[18px] w-[18px]" />}
        {unread > 0 && (
          <span className="num absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-down px-1 text-[9px] font-bold text-white">
            {unread.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="card absolute end-0 top-full z-50 mt-2 w-80 p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-bold">هشدارهای قیمت</span>
              {triggered.length > 0 && (
                <button
                  onClick={() => {
                    clearTriggered();
                  }}
                  className="text-[10px] text-muted hover:text-down"
                >
                  پاک‌سازی خوانده‌شده‌ها
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <p className="px-1 py-6 text-center text-[11px] leading-5 text-muted">
                هنوز هشداری نساختی — تو صفحه هر سهم می‌تونی هشدار قیمت بذاری
              </p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {[...active, ...triggered].map((a) => (
                  <div
                    key={a.id}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${
                      a.triggeredAt ? "border-gold/40 bg-gold/10" : "border-line bg-surface-2/50"
                    }`}
                  >
                    <span className="font-bold text-brand">{a.symbol}</span>
                    <span className="num text-muted">
                      {faPrice(a.target)} {a.direction === "up" ? "↑" : "↓"}
                    </span>
                    {a.triggeredAt ? (
                      <span className="text-[10px] font-semibold text-gold">
                        ✓ فعال شد {new Date(a.triggeredAt).toLocaleTimeString("fa-IR")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">در انتظار</span>
                    )}
                    <button
                      aria-label="حذف هشدار"
                      onClick={() => removeAlert(a.id)}
                      className="ms-auto text-muted/60 hover:text-down"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
