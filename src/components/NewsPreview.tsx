"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, ExternalLink, Newspaper } from "lucide-react";
import { faRelativeTime } from "@/lib/format";

interface RawNews {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  description: string;
}

const SOURCE_STYLE: Record<string, string> = {
  "اقتصاد آنلاین": "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "دنیای اقتصاد": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ایسنا: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  مهر: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  خبرآنلاین: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

const sourceStyle = (s: string) => SOURCE_STYLE[s] ?? "bg-surface-2 text-muted";

export function NewsPreview() {
  const [news, setNews] = useState<RawNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/news");
        const json = await res.json();
        if (alive && json.ok) setNews(json.data.news.slice(0, 7));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const [featured, ...rest] = news;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <Newspaper className="h-4 w-4 text-brand" /> اخبار بازار
          <span className="flex items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-normal text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up" />
            </span>
            زنده
          </span>
        </h2>
        <Link href="/news" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
          همه اخبار و غربال شایعات
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-28 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* خبر ویژه (جدیدترین) */}
          {featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="card animate-fade-up group block p-5 transition-all hover:border-brand/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${sourceStyle(featured.source)}`}>
                  {featured.source}
                </span>
                <span className="num flex items-center gap-1 text-[10px] text-muted">
                  <Clock3 className="h-3 w-3" /> {faRelativeTime(featured.pubDate)}
                </span>
                <ExternalLink className="ms-auto h-3.5 w-3.5 text-muted/40 transition-all group-hover:-translate-y-0.5 group-hover:text-brand" />
              </div>
              <h3 className="mt-2.5 text-sm font-black leading-7 transition-colors group-hover:text-brand sm:text-base">
                {featured.title}
              </h3>
              {featured.description && (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-muted">{featured.description}</p>
              )}
            </a>
          )}

          {/* بقیه — ردیفی فشرده */}
          <div className="card divide-y divide-line/50 overflow-hidden">
            {rest.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-3.5 transition-colors hover:bg-brand-soft/40"
                style={{ animationDelay: `${(i + 1) * 60}ms` }}
              >
                <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${sourceStyle(n.source)}`}>
                  {n.source}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium leading-6">{n.title}</span>
                <span className="num hidden shrink-0 items-center gap-1 text-[9px] text-muted sm:flex">
                  <Clock3 className="h-2.5 w-2.5" /> {faRelativeTime(n.pubDate)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
