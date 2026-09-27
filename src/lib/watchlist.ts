"use client";

export interface WatchItem {
  insCode: string;
  symbol: string;
  name: string;
}

const KEY = "tj-watchlist";
const EVENT = "tj-watchlist-change";

export function getWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setWatchlist(items: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function isWatched(insCode: string): boolean {
  return getWatchlist().some((i) => i.insCode === insCode);
}

export function addToWatchlist(item: WatchItem) {
  const items = getWatchlist();
  if (items.some((i) => i.insCode === item.insCode)) return;
  setWatchlist([{ ...item }, ...items].slice(0, 30));
}

export function removeFromWatchlist(insCode: string) {
  setWatchlist(getWatchlist().filter((i) => i.insCode !== insCode));
}

export function toggleWatchlist(item: WatchItem): boolean {
  if (isWatched(item.insCode)) {
    removeFromWatchlist(item.insCode);
    return false;
  }
  addToWatchlist(item);
  return true;
}

/** هک برای فرانت: شنیدن تغییرات دیده‌بان */
export function onWatchlistChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
