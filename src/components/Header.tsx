"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, Menu, MessageCircleQuestion, Newspaper, Scale, Sparkles, X } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { AlertsBell } from "./PriceAlerts";

const links = [
  { href: "/", label: "صفحه اصلی", icon: null, soon: false },
  { href: "/compare", label: "مقایسه سهم‌ها", icon: <Scale className="h-4 w-4" />, soon: false },
  { href: "/news", label: "اخبار مهم بازار", icon: <Newspaper className="h-4 w-4" />, soon: false },
  { href: "/qa", label: "پرسش و پاسخ هوشمند", icon: <MessageCircleQuestion className="h-4 w-4" />, soon: false },
  { href: "/about", label: "درباره ما", icon: <Info className="h-4 w-4" />, soon: false },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="glass sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 shadow-card">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold sm:text-base">تحلیلگر جامع</div>
            <div className="hidden text-[10px] text-muted sm:block">تحلیل هوشمند بورس ایران</div>
          </div>
        </Link>

        <SearchBar className="mx-auto hidden max-w-xl flex-1 md:block" />

        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <div className="md:hidden">
            <SearchBar className="w-36 sm:w-52" />
          </div>
          <ThemeToggle />
          <AlertsBell />
          <button
            aria-label="منو"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2/60 text-muted transition-colors hover:text-ink"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* دراور منو */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <div
          className={`glass absolute inset-y-0 left-0 w-72 max-w-[85vw] p-5 transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm font-bold text-muted">منو</span>
            <button
              aria-label="بستن"
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-1.5">
            {links.map((l) => {
              const isActive = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface-2"
                  }`}
                >
                  {l.icon}
                  {l.label}
                  {l.soon && (
                    <span className="ms-auto rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                      به‌زودی
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-xl border border-dashed border-line p-4 text-center text-xs text-muted">
            بخش‌های بیشتر در آینده به منو اضافه می‌شود
          </div>
        </div>
      </div>
    </header>
  );
}
