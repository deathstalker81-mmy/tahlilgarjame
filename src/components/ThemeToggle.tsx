"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label={isDark ? "حالت روز" : "حالت شب"}
      title={isDark ? "حالت روز" : "حالت شب"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted transition-all duration-300 hover:text-ink hover:shadow-card"
    >
      <Sun
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          mounted && !isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <Moon
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          mounted && isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
