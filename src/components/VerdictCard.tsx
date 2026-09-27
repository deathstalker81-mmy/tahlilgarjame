"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Scale, Sparkles } from "lucide-react";

interface Verdict {
  verdict: string;
  story: string;
  strategy: string;
  confidence: number;
}

export function VerdictCard({ insCode, refreshSignal }: { insCode: string; refreshSignal: number }) {
  const [state, setState] = useState<"checking" | "waiting" | "ready" | "error">("checking");
  const [missing, setMissing] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const check = useCallback(
    async (build = false) => {
      try {
        if (build) setLoading(true);
        const res = await fetch(`/api/stock/${insCode}/verdict`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error === "NO_KEY" ? "NO_KEY" : "خطا");
        if (json.data.ready) {
          setVerdict(json.data.verdict);
          setState("ready");
        } else {
          setMissing(json.data.missing ?? []);
          setState("waiting");
        }
      } catch (err) {
        if (err instanceof Error && err.message === "NO_KEY") setState("error");
        else setState("waiting");
      } finally {
        setLoading(false);
      }
    },
    [insCode],
  );

  useEffect(() => {
    setState("checking");
    check(false);
  }, [check, refreshSignal]);

  /* وقتی در انتظاره، هر ۱۵ ثانیه چک کن (کاربر ممکنه تب دیگه رو تحلیل کرده باشه) */
  useEffect(() => {
    if (state !== "waiting" && state !== "checking") return;
    const t = setInterval(() => check(false), 15000);
    return () => clearInterval(t);
  }, [state, check]);

  /* تا هر دو تحلیل آماده نشده، چیزی نمایش داده نمی‌شود */
  if (state === "waiting" || state === "checking") return null;
  if (state === "error") return null;

  return (
    <div
      className={`card animate-fade-up relative overflow-hidden p-5 ${
        state === "ready" ? "border-2 border-brand/40" : ""
      }`}
    >
      <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-brand-soft blur-2xl" />
      <div className="relative flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-brand" />
        <span className="text-xs font-black">جمع‌بندی نهایی: تکنیکال × فاندامنتال</span>
      </div>

      {state === "ready" && verdict && (
        <div className="relative mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-brand px-3 py-1 text-sm font-black text-white">
              {verdict.verdict}
            </span>
            <span className="num rounded-lg bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">
              اطمینان: {verdict.confidence.toLocaleString("fa-IR")}٪
            </span>
            <button
              onClick={() => check(true)}
              disabled={loading}
              className="ms-auto flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[10px] text-muted hover:text-brand disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              جمع‌بندی مجدد
            </button>
          </div>
          <p className="mt-3 text-xs leading-6 sm:text-[13px]">{verdict.story}</p>
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-up/10 p-3 text-[11px] leading-5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" />
            <span>
              <span className="font-bold">توصیه عملی:</span> {verdict.strategy}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
