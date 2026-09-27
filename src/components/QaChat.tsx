"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2, SendHorizontal, User } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "نظرت درباره فولاد چیه؟",
  "وضعیت کلی بازار امروز چطوره؟",
  "واحد بازار چقدر شد؟",
  "P/E یعنی چی و چرا مهمه؟",
  "فرق بورس و فرابورس چیه؟",
];

const HISTORY_KEY = "tj-qa-history";

/** مارک‌داون ساده را به HTML امن تبدیل می‌کند */
function mdLite(text: string): string {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|\n)\s*[*•]\s+/g, "$1• ");
}

export function QaChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      if (Array.isArray(saved)) setMessages(saved.slice(-30));
    } catch {
      /* ignore */
    }
  }, []);

  const autoSentRef = useRef(false);

  /* سوال از URL (از کارت صفحه اصلی) — یک‌بار خودکار بپرس */
  const searchParams = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-8) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error === "NO_KEY" ? "NO_KEY" : "خطا در پاسخ‌دهی");
      const done = [...next, { role: "assistant" as const, content: json.data.reply }];
      setMessages(done);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(done.slice(-30)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[480px] flex-col overflow-hidden">
      {/* هدر چت */}
      <div className="flex items-center gap-3 border-b border-line p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 shadow-card">
          <Brain className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold">تحلیلگر جامع</div>
          <div className="text-[10px] text-muted">آنلاین — با دسترسی به داده‌های لحظه‌ای</div>
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-muted hover:text-down">
            گفتگوی جدید
          </button>
        )}
      </div>

      {/* پیام‌ها */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
              <Brain className="h-8 w-8 text-brand" />
            </div>
            <div>
              <div className="text-sm font-bold">بپرس…</div>
              <p className="mt-1 max-w-sm text-xs leading-6 text-muted">
                درباره نمادها، شاخص‌ها یا مفاهیم بورسی سوال کن. اگه اسم نماد رو بیاری، داده لحظه‌ای هم می‌گیرم.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-surface-2/60 px-3.5 py-1.5 text-[11px] text-muted transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                m.role === "user" ? "bg-surface-2 text-muted" : "bg-gradient-to-br from-brand to-violet-500 text-white"
              }`}
            >
              {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-6 sm:text-sm ${
                m.role === "user"
                  ? "whitespace-pre-wrap rounded-tr-sm bg-brand/15"
                  : "rounded-tl-sm bg-surface-2/70 [&_strong]:font-bold"
              }`}
              {...(m.role === "assistant"
                ? { dangerouslySetInnerHTML: { __html: mdLite(m.content) } }
                : { children: m.content })}
            />
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-violet-500 text-white">
              <Brain className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-surface-2/70 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
              <span className="text-[11px] text-muted">در حال بررسی داده‌های لحظه‌ای…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-line bg-down/10 px-4 py-2 text-center text-[11px] text-down">
          {error === "NO_KEY" ? "برای گفتگو، کلید AvalAI را در .env.local قرار بده" : error}
        </p>
      )}

      {/* ورودی */}
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2/70 px-3 py-2 focus-within:border-brand/60">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="سوالت رو بنویس… (مثلاً: نظرت درباره وبملت؟)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
            dir="rtl"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            aria-label="ارسال"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-all hover:opacity-90 active:scale-90 disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  );
}
