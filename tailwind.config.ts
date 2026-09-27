import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        brand: {
          DEFAULT: "#6366F1",
          soft: "var(--brand-soft)",
        },
        up: "#22C55E",
        down: "#EF4444",
        gold: "#F59E0B",
      },
      fontFamily: {
        sans: ["var(--font-vazir)", "Tahoma", "sans-serif"],
        nums: ["var(--font-vazir)", "Tahoma", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.12)",
        card: "0 2px 12px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-up": "fade-up 0.5s ease both",
        shimmer: "shimmer 1.6s linear infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
