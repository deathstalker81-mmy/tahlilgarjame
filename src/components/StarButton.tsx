"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { isWatched, toggleWatchlist, onWatchlistChange } from "@/lib/watchlist";

export function StarButton({
  insCode,
  symbol,
  name,
  size = "sm",
}: {
  insCode: string;
  symbol: string;
  name: string;
  size?: "sm" | "md";
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isWatched(insCode));
    return onWatchlistChange(() => setActive(isWatched(insCode)));
  }, [insCode]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(toggleWatchlist({ insCode, symbol, name }));
  };

  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <button
      aria-label={active ? "حذف از دیده‌بان" : "افزودن به دیده‌بان"}
      title={active ? "حذف از دیده‌بان" : "افزودن به دیده‌بان"}
      onClick={onClick}
      className={`shrink-0 transition-transform active:scale-90 ${active ? "text-gold" : "text-muted/50 hover:text-gold"}`}
    >
      <svg className={dim} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.57.57 0 011.04 0l2.35 4.76c.06.12.18.2.31.23l5.25.76c.48.07.67.66.32 1l-3.8 3.7c-.1.1-.14.24-.12.38l.9 5.23c.08.48-.42.84-.85.62l-4.7-2.47a.57.57 0 00-.53 0l-4.7 2.47c-.43.22-.93-.14-.85-.62l.9-5.23a.57.57 0 00-.12-.38l-3.8-3.7c-.35-.34-.16-.93.32-1l5.25-.76a.57.57 0 00.31-.23l2.35-4.76z" />
      </svg>
    </button>
  );
}
