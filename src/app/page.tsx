import Link from "next/link";
import { Brain, Search, Sparkles } from "lucide-react";
import { MarketOverviewCards } from "@/components/MarketOverviewCards";
import { MoversTabs } from "@/components/MoversTabs";
import { NewsPreview } from "@/components/NewsPreview";
import { WatchlistSection } from "@/components/WatchlistSection";
import { DailyDigest } from "@/components/DailyDigest";
import { Ticker } from "@/components/Ticker";
import { MarketSectors } from "@/components/MarketSectors";
import { MarketScanner } from "@/components/MarketScanner";
import { SearchBar } from "@/components/SearchBar";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* هیرو */}
      <section className="pt-4 text-center sm:pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-500 shadow-glass">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">
          تحلیل هوشمند بورس ایران
          <span className="bg-gradient-to-l from-brand to-emerald-400 bg-clip-text text-transparent"> با قدرت AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
          نماد مورد نظرت را جستجو کن؛ هوش مصنوعی اخبار را غربال می‌کند، فاندامنتال و تکنیکال را تحلیل می‌کند و
          پیشنهاد خود را با دلایل ارائه می‌دهد.
        </p>
        <div className="mx-auto mt-6 max-w-xl md:hidden">
          <SearchBar />
        </div>
      </section>

      {/* تیکر متحرک برترین‌ها */}
      <Ticker />

      {/* گزارش روز بازار */}
      <DailyDigest />

      {/* شاخص‌های بازار */}
      <MarketOverviewCards />

      {/* دیده‌بان من */}
      <div className="reveal"><WatchlistSection /></div>

      {/* موورز */}
      <div className="reveal"><MoversTabs /></div>

      {/* صنعت‌های امروز */}
      <div className="reveal"><MarketSectors /></div>

      {/* رادار بازار */}
      <div className="reveal"><MarketScanner /></div>

      {/* اخبار زنده */}
      <div className="reveal"><NewsPreview /></div>

      {/* پرسش و پاسخ — ویجت گرادیانی با سوالات کلیک‌پذیر */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand via-brand/90 to-violet-600 p-6 shadow-glass sm:p-8">
        <div className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white sm:text-xl">سوالی داری؟ از تحلیلگر جامع بپرس</h2>
            <p className="mt-0.5 text-xs leading-5 text-white/80 sm:text-sm">
              با دسترسی به قیمت‌ها و داده‌های لحظه‌ای بازار جواب می‌دهد
            </p>
          </div>
          <Link
            href="/qa"
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-brand shadow-card transition-transform hover:scale-105 active:scale-95"
          >
            شروع گفتگو ←
          </Link>
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          {["نظرت درباره فولاد چیه؟", "شاخص امروز چطور بود؟", "P/E یعنی چی؟"].map((q) => (
            <Link
              key={q}
              href={`/qa?q=${encodeURIComponent(q)}`}
              className="rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition-all hover:bg-white/25"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* راهنما */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-bold sm:text-base">چطور کار می‌کنه؟</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Search, title: "۱. نماد را پیدا کن", desc: "از جستجوی بالای صفحه نماد دلخواهت را انتخاب کن." },
            {
              icon: Brain,
              title: "۲. تحلیل کامل بگیر",
              desc: "AI اخبار و داده‌های سهم را غربال و تحلیل می‌کند؛ مثبت‌ها، منفی‌ها و ریسک‌ها را می‌بینی.",
            },
            {
              icon: Sparkles,
              title: "۳. تصمیم هوشمندانه",
              desc: "پیشنهاد خرید، هولد یا فروش را همراه با دلایل و سطح اطمینان دریافت کن.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-xl border border-line bg-surface-2/50 p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <s.icon className="h-[18px] w-[18px]" />
              </div>
              <div className="text-sm font-semibold">{s.title}</div>
              <p className="mt-1 text-xs leading-5 text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
