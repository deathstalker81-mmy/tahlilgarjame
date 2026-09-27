"use client";

import { useState } from "react";

const CANDIDATES = (insId: string) => [
  `https://cdn.tsetmc.com/CompanyLogo/${insId}.png`,
  `https://www.tsetmc.com/CompanyLogo/${insId}.png`,
];

function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/** لوگوی شرکت — اگر تصویری در دسترس نبود، آواتار حرف اول نماد */
export function CompanyLogo({
  insId,
  symbol,
  size = 48,
}: {
  insId?: string | null;
  symbol: string;
  size?: number;
}) {
  const urls = insId ? CANDIDATES(insId) : [];
  const [idx, setIdx] = useState(0);
  const hasCandidate = idx < urls.length;
  const hue = hueOf(symbol || "X");

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-card"
      style={{
        width: size,
        height: size,
        background: hasCandidate
          ? "var(--surface-2)"
          : `linear-gradient(135deg, hsl(${hue} 72% 52%), hsl(${(hue + 45) % 360} 68% 40%))`,
      }}
    >
      {hasCandidate ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urls[idx]}
          alt={symbol}
          width={size}
          height={size}
          className="h-full w-full object-contain p-1.5"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <>
          <span
            className="font-black text-white"
            style={{ fontSize: size * 0.34, letterSpacing: "-0.02em" }}
          >
            {symbol.slice(0, 2)}
          </span>
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.15)" }}
          />
        </>
      )}
    </div>
  );
}
