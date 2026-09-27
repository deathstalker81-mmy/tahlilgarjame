"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ExternalLink, Loader2, Newspaper, ShieldCheck, Sparkles } from "lucide-react";
import { faDateTime } from "@/lib/format";

interface RawNews {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  description: string;
}

interface CuratedNews {
  title: string;
  source: string;
  pubDate: number;
  link: string;
  category: string;
  importance: number;
  credibility: "تأیید شده" | "محتمل" | "شایعه";
  summary: string;
}

interface CodalLetterItem {
  tracingNo: number;
  title: string;
  symbol: string;
  pubDate: number;
  url: string;
  category: string;
}

function impColor(v: number) {
  return v >= 80 ? "text-down bg-down/15" : v >= 60 ? "text-gold bg-gold/15" : "text-brand bg-brand-soft";
}

function credBadge(c: string) {
  if (c === "تأیید شده")
    return { cls: "bg-up/15 text-up", icon: <ShieldCheck className="h-3 w-3" /> };
  if (c === "شایعه") return { cls: "bg-down/15 text-down", icon: <span className="text-[9px]">⚠️</span> };
  return { cls: "bg-gold/15 text-gold", icon: <span className="text-[9px]">🤔</span> };
}

export function NewsList() {
  const [news, setNews] = useState<RawNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [curated, setCurated] = useState<{
    groupA: CodalLetterItem[];
    groupB: CodalLetterItem[];
    screened: CuratedNews[] | null;
    aiError: string | null;
  } | null>(null);
  const [curating, setCurating] = useState(false);
  const [curErr, setCurErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/news");
        const json = await res.json();
        if (alive && json.ok) setNews(json.data.news);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const curate = async () => {
    setCurating(true);
    setCurErr(null);
    try {
      const res = await fetch("/api/news/curated");
      const json = await res.json();
      if (!json.ok) throw new Error("خطا");
      setCurated(json.data);
    } catch (err) {
      setCurErr(err instanceof Error ? err.message : String(err));
    } finally {
      setCurating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* غربال هوشمند: کدال الف/ب + اعتبار اخبار */}
      <section>
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 shadow-card">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold">واحد غربال اخبار و شایعات</h2>
              <p className="mt-0.5 text-xs text-muted">
                گروه الف و ب کدال جدا می‌شود، تکراری‌ها حذف می‌شوند و شایعات سطح اعتبار می‌گیرند.
              </p>
            </div>
            <button
              onClick={curate}
              disabled={curating}
              className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white shadow-card transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {curating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {curating ? "در حال غربال…" : curated ? "غربال مجدد" : "شروع غربال هوشمند"}
            </button>
          </div>

          {curErr && (
            <p className="mt-3 rounded-lg bg-down/10 p-3 text-center text-xs text-down">
              {curErr === "NO_KEY" ? "برای غربال هوشمند، کلید AvalAI را در .env.local قرار بده" : "خطا در غربال — دوباره تلاش کن"}
            </p>
          )}

          {curated && (
            <div className="mt-5 space-y-4">
              {/* گروه الف */}
              {curated.groupA.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-down">
                    🚨 گروه الف کدال — اسناد بااهمیت بازار
                  </div>
                  <div className="space-y-2">
                    {curated.groupA.map((l) => (
                      <a key={l.tracingNo} href={l.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-down/25 bg-down/5 p-3 transition-colors hover:border-down/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold leading-6">{l.title}</div>
                          <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-muted/50" />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                          <span className="rounded bg-down/10 px-1.5 py-0.5 font-bold text-down">{l.symbol}</span>
                          {l.pubDate > 0 && <span className="num">{faDateTime(l.pubDate)}</span>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* گروه ب */}
              {curated.groupB.length > 0 && (
                <details className="rounded-xl border border-line/70 bg-surface-2/30 p-3">
                  <summary className="cursor-pointer text-[11px] font-bold text-muted">
                    📋 گروه ب کدال — اطلاعیه‌های روتین ({curated.groupB.length.toLocaleString("fa-IR")} مورد)
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {curated.groupB.map((l) => (
                      <a key={l.tracingNo} href={l.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg p-2 text-[11px] leading-5 transition-colors hover:bg-brand-soft/40">
                        <span className="font-bold text-brand">{l.symbol}</span> — {l.title}
                        {l.pubDate > 0 && <span className="num ms-2 text-[9px] text-muted">{faDateTime(l.pubDate)}</span>}
                      </a>
                    ))}
                  </div>
                </details>
              )}

              {/* اخبار رسانه‌ها با سطح اعتبار */}
              {curated.screened && curated.screened.length > 0 && (
                <div>
                  <div className="mb-2 text-[11px] font-black text-brand">📰 اخبار رسانه‌ها — غربال و اعتبار‌سنجی شده</div>
                  <div className="space-y-2">
                    {curated.screened.map((s, i) => {
                      const cred = credBadge(s.credibility);
                      return (
                        <div key={i} className="animate-fade-up rounded-xl border border-line/70 bg-surface-2/40 p-3.5">
                          <div className="flex items-start gap-2.5">
                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <div className="min-w-0 flex-1">
                              <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold leading-6 hover:text-brand">
                                {s.title}
                              </a>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                                <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${cred.cls}`}>
                                  {cred.icon} {s.credibility}
                                </span>
                                <span className={`rounded-md px-1.5 py-0.5 font-bold ${impColor(s.importance)}`}>
                                  اهمیت {s.importance.toLocaleString("fa-IR")}٪
                                </span>
                                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted">{s.category}</span>
                                <span className="text-muted">{s.source}</span>
                                {s.pubDate > 0 && <span className="num text-muted">{faDateTime(s.pubDate)}</span>}
                              </div>
                              <p className="mt-1.5 text-[11px] leading-5 text-muted">{s.summary}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* همه اخبار */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Newspaper className="h-4 w-4 text-brand" /> آخرین اخبار اقتصادی
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="card divide-y divide-line/60 overflow-hidden">
            {news.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 transition-colors hover:bg-brand-soft/40"
              >
                <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted/60" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium leading-6">{n.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5">{n.source}</span>
                    {n.pubDate > 0 && <span>{faDateTime(n.pubDate)}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
