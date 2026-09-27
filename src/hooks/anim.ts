"use client";

import { useEffect, useRef, useState } from "react";

/** شمارش نرم عدد به سمت مقدار جدید (مثل اپ‌های مالی) */
export function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target || !Number.isFinite(target)) return;
    fromRef.current = target;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return val;
}

/** کلاس فلش سبز/قرمز وقتی مقدار تغییر می‌کند (استاندارد اپ‌های ترید) */
export function useFlashClass(value: number): { cls: string; key: number } {
  const prevRef = useRef(value);
  const [cls, setCls] = useState("");
  const [key, setKey] = useState(0);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === value || !Number.isFinite(value)) return;
    prevRef.current = value;
    setCls(value > prev ? "flash-up" : "flash-down");
    setKey((k) => k + 1);
    const t = setTimeout(() => setCls(""), 900);
    return () => clearTimeout(t);
  }, [value]);

  return { cls, key };
}
