"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Check, KeyRound, Loader2, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { faPrice } from "@/lib/format";

interface Claim {
  text: string;
  evidence: string;
}

interface AiResult {
  trend: string;
  layers: {
    structure: string;
    momentum: string;
    patterns: string | null;
    timeframes: string;
  };
  summary: string;
  positives: Claim[];
  negatives: Claim[];
  plan: {
    entry: { min: number; max: number; note: string } | null;
    stopLoss: number | null;
    targets: number[];
    riskReward: string | null;
    invalidation: string | null;
  };
  conclusion: "خرید" | "هولد" | "فروش";
  confidence: number;
  verified?: { checked: number; removed: number };
}

const steps = ["دریافت داده‌های چارت", "محاسبه اندیکاتورها", "تحلیل هوش مصنوعی", "تدوین نتیجه"];

export function TechnicalAI({
  insCode,
  onResult,
  initialAi,
}: {
  insCode: string;
  onResult?: (ai: AiResult | null) => void;
  initialAi?: AiResult | null;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(initialAi ? "done" : "idle");
  const [ai, setAi] = useState<AiResult | null>(initialAi ?? null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (stepTimer.current && clearInterval(stepTimer.current)), []);

  const analyze = async () => {
    setState("loading");
    setStep(0);
    stepTimer.current = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500);
    try {
      const res = await fetch(`/api/stock/${insCode}/technical`);
      const json = await res.json();
      if (!json.ok) throw new Error("خطای سرور");
      const { ai: result, aiError } = json.data;
      onResult?.(result);
      if (aiError === "NO_KEY") throw new Error("NO_KEY");
      if (!result) throw new Error(aiError || "پاسخی دریافت نشد");
      setAi(result);
      setState("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
    }
  };

  /* ---------- حالت‌ها ---------- */
  if (state === "idle")
    return (
      <div className="card flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-500 shadow-glass">
          <Brain className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold">تحلیل تکنیکال چندلایه با هوش مصنوعی</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted">
            سه لایه: ساختار (Price Action) + مومنتوم + الگوهای نموداری، تحلیل چندتایم‌فریمی، و پلن کامل
            ورود/حد ضرر/اهداف با نسبت ریسک به ریوارد.
          </p>
        </div>
        <button
          onClick={analyze}
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:opacity-90 active:scale-95"
        >
          <Sparkles className="h-4 w-4" /> شروع تحلیل
        </button>
      </div>
    );

  if (state === "loading")
    return (
      <div className="card p-8">
        <div className="mb-6 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          <h3 className="text-base font-bold">در حال تحلیل…</h3>
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-colors ${
                  i < step ? "bg-up/20 text-up" : i === step ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : (i + 1).toLocaleString("fa-IR")}
              </div>
              <span className={i <= step ? "font-medium" : "text-muted"}>{s}</span>
              {i === step && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />}
            </div>
          ))}
        </div>
      </div>
    );

  if (state === "error")
    return (
      <div className="card p-8">
        {errMsg === "NO_KEY" ? (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">
              <KeyRound className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold">اتصال به هوش مصنوعی برقرار نشد</h3>
            <p className="mt-2 text-xs leading-6 text-muted">
              برای فعال‌سازی تحلیل هوشمند، کلید API سرویس AvalAI را در فایل
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">.env.local</code>
              در مقدار
              <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">AI_API_KEY</code>
              قرار بده و سرور را ری‌استارت کن.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted">خطا در تحلیل هوش مصنوعی</p>
            <p className="mt-1 text-[11px] text-muted/70">{errMsg}</p>
            <button
              onClick={analyze}
              className="mt-4 rounded-xl bg-brand-soft px-5 py-2 text-sm font-semibold text-brand transition-transform active:scale-95"
            >
              تلاش مجدد
            </button>
          </div>
        )}
      </div>
    );

  /* ---------- نتیجه ---------- */
  const conclusionStyle =
    ai!.conclusion === "خرید"
      ? { bg: "bg-up/15", text: "text-up" }
      : ai!.conclusion === "فروش"
        ? { bg: "bg-down/15", text: "text-down" }
        : { bg: "bg-gold/15", text: "text-gold" };

  const layerDefs = [
    { title: "۱️⃣ ساختار (Price Action)", body: ai!.layers?.structure },
    { title: "۲️⃣ مومنتوم", body: ai!.layers?.momentum },
    { title: "۳️⃣ الگوهای نموداری", body: ai!.layers?.patterns },
    { title: "۴️⃣ چندتایم‌فریمی", body: ai!.layers?.timeframes },
  ].filter((l) => l.body);

  return (
    <div className="card animate-fade-up p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet-500 shadow-card">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold">تحلیل تکنیکال هوش مصنوعی</h3>
          <span className={`mt-1 inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${conclusionStyle.bg} ${conclusionStyle.text}`}>
            پیشنهاد: {ai!.conclusion}
          </span>
        </div>
        <button
          onClick={analyze}
          title="تحلیل مجدد"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-muted transition-colors hover:text-ink"
        >
          <Loader2 className="h-3.5 w-3.5" /> تحلیل مجدد
        </button>
      </div>

      {/* سطح اطمینان */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted">سطح اطمینان AI</span>
          <span className="num font-bold">{ai!.confidence.toLocaleString("fa-IR")}٪</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-l from-brand to-violet-400 transition-all duration-700"
            style={{ width: `${ai!.confidence}%` }}
          />
        </div>
      </div>

      {/* چهار لایه */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {layerDefs.map((l) => (
          <div key={l.title} className="rounded-xl border border-line/70 bg-surface-2/40 p-3">
            <div className="text-[10px] font-black text-brand">{l.title}</div>
            <p className="mt-1 text-[11px] leading-5">{l.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-7">{ai!.summary}</p>

      {/* پلن معامله */}
      {ai!.plan && (
        <div className="mt-4 rounded-2xl border-2 border-brand/30 bg-brand-soft/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black text-brand">
            <Target className="h-4 w-4" /> پلن معامله
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ai!.plan.entry && (
              <div className="rounded-xl border border-up/30 bg-up/5 p-3">
                <div className="text-[10px] font-bold text-up">📍 نقطه ورود</div>
                <div className="num mt-1 text-sm font-black">
                  {faPrice(ai!.plan.entry.min)} — {faPrice(ai!.plan.entry.max)}
                </div>
                <p className="mt-0.5 text-[10px] text-muted">{ai!.plan.entry.note}</p>
              </div>
            )}
            {ai!.plan.stopLoss !== null && (
              <div className="rounded-xl border border-down/30 bg-down/5 p-3">
                <div className="text-[10px] font-bold text-down">🛑 حد ضرر</div>
                <div className="num mt-1 text-sm font-black text-down">{faPrice(ai!.plan.stopLoss)}</div>
                <p className="mt-0.5 text-[10px] text-muted">زیر این قیمت، تحلیل باطل است</p>
              </div>
            )}
            {ai!.plan.targets?.length > 0 && (
              <div className="rounded-xl border border-up/30 bg-up/5 p-3">
                <div className="text-[10px] font-bold text-up">🎯 اهداف سود</div>
                <div className="num mt-1 text-sm font-black">
                  {ai!.plan.targets.filter((t) => typeof t === "number").map((t) => faPrice(t)).join(" — ")}
                </div>
                <p className="mt-0.5 text-[10px] text-muted">هدف ۱ و هدف ۲ (مقاومت‌ها)</p>
              </div>
            )}
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
              <div className="text-[10px] font-bold text-gold">⚖️ ریسک به ریوارد</div>
              <div className="num mt-1 text-sm font-black text-gold">{ai!.plan.riskReward ?? "—"}</div>
              {ai!.plan.invalidation && <p className="mt-0.5 text-[10px] text-muted">{ai!.plan.invalidation}</p>}
            </div>
          </div>
        </div>
      )}

      {/* مثبت و منفی */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ai!.positives.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-bold text-up">نکات مثبت</div>
            <ul className="space-y-2">
              {ai!.positives.map((p, i) => (
                <li key={i} className="rounded-lg border border-up/20 bg-up/5 p-2.5">
                  <div className="flex items-start gap-2 text-xs leading-5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" />
                    {p.text}
                  </div>
                  {p.evidence && <div className="num mt-1 ps-6 text-[10px] leading-4 text-muted">شاهد: {p.evidence}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {ai!.negatives.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-bold text-down">نکات منفی / ریسک‌ها</div>
            <ul className="space-y-2">
              {ai!.negatives.map((p, i) => (
                <li key={i} className="rounded-lg border border-down/20 bg-down/5 p-2.5">
                  <div className="flex items-start gap-2 text-xs leading-5">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-down" />
                    {p.text}
                  </div>
                  {p.evidence && <div className="num mt-1 ps-6 text-[10px] leading-4 text-muted">شاهد: {p.evidence}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* بج بازبینی */}
      {ai!.verified && ai!.verified.checked > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-up/25 bg-up/5 px-3 py-2 text-[10px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-up" />
          بازبینی مستقل: هر {ai!.verified.checked.toLocaleString("fa-IR")} ادعا با داده خام تطبیق داده شد
          {ai!.verified.removed > 0
            ? ` — ${ai!.verified.removed.toLocaleString("fa-IR")} ادعای بدون پشتوانه حذف شد`
            : " — تناقضی پیدا نشد"}
        </div>
      )}

      <p className="mt-5 border-t border-line/60 pt-3 text-[10px] leading-5 text-muted/70">
        این تحلیل توسط هوش مصنوعی تولید و با داده‌های خام تطبیق داده شده است؛ توصیه خرید و فروش نیست.
      </p>
    </div>
  );
}

export type { AiResult };
