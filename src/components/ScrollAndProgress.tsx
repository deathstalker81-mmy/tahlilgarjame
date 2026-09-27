"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** اسکرول‌ریویل: عناصر .reveal با ورود به دید ظاهر می‌شوند */
export function ScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.revealed)").forEach((el) => obs.observe(el));
    scan();
    const t = setInterval(scan, 1200);
    return () => {
      obs.disconnect();
      clearInterval(t);
    };
  }, []);
  return null;
}

/** نوار پیشرفت ناوبری بالای صفحه */
export function RouteProgress() {
  const pathname = usePathname();
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPct(25);
    const t1 = setTimeout(() => setPct(75), 120);
    const t2 = setTimeout(() => setPct(100), 450);
    const t3 = setTimeout(() => setPct(0), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] h-0.5 transition-all duration-500"
      style={{
        width: `${pct}%`,
        opacity: pct > 0 && pct < 100 ? 1 : 0,
        background: "linear-gradient(90deg, #6366F1, #8B5CF6, #6366F1)",
        boxShadow: "0 0 8px rgba(99,102,241,0.7)",
      }}
    />
  );
}
