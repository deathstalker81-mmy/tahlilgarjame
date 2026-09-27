"use client";

export interface PriceAlert {
  id: string;
  insCode: string;
  symbol: string;
  target: number;
  direction: "up" | "down";
  createdAt: number;
  triggeredAt: number | null;
}

const KEY = "tj-alerts";
const EVENT = "tj-alerts-change";

export function getAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: PriceAlert[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function addAlert(insCode: string, symbol: string, target: number, direction: "up" | "down"): PriceAlert {
  const alert: PriceAlert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    insCode,
    symbol,
    target,
    direction,
    createdAt: Date.now(),
    triggeredAt: null,
  };
  save([alert, ...getAlerts()].slice(0, 20));
  return alert;
}

export function removeAlert(id: string) {
  save(getAlerts().filter((a) => a.id !== id));
}

export function markTriggered(id: string) {
  save(getAlerts().map((a) => (a.id === id ? { ...a, triggeredAt: Date.now() } : a)));
}

export function clearTriggered() {
  save(getAlerts().filter((a) => a.triggeredAt === null));
}

export function onAlertsChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
