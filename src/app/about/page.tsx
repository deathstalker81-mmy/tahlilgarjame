import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Brain, Eye, Newspaper, Radar, Scale, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "درباره ما",
};

const features = [
  { icon: Brain, title: "تحلیل تکنیکال چندلایه", desc: "ساختار قیمت، مومنتوم، الگوهای نموداری و تحلیل چندتایم‌فریمی با هوش مصنوعی" },
  { icon: Newspaper, title: "فاندامنتال سندمحور", desc: "خواندن صورت‌های مالی و اطلاعیه‌های رسمی کدال + غربال اخبار با سطح اعتبار" },
  { icon: Eye, title: "در یک نگاه مالی", desc: "ROE، بدهی، حاشیه‌ها و روند سود — محاسبه قطعی از صورت‌های مالی حسابرسی‌شده" },
  { icon: Radar, title: "رادار بازار", desc: "اسکن ماشینی سهم‌های پرحجم با امتیازدهی شفاف" },
  { icon: Scale, title: "مقایسه و جمع‌بندی", desc: "تقابل تکنیکال و فاندامنتال برای تصمیم نهایی" },
  { icon: ShieldCheck, title: "اصل حقیقت", desc: "هر عدد از TSETMC و کدال؛ هر الگو ریاضی؛ هر حدس صریحا اعلام می‌شود" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-4">
      {/* قهرمان */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand via-brand/90 to-violet-600 p-8 text-center shadow-glass">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-6 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-card backdrop-blur">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">تحلیلگر جامع</h1>
          <p className="mt-2 text-sm leading-6 text-white/85">
            پلتفرم تحلیل هوشمند بورس ایران — جایی که داده‌های واقعی، تحلیل‌های قطعی و هوش مصنوعی کنار هم می‌آیند
          </p>
        </div>
      </div>

      {/* سازنده */}
      <div className="card p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/company-logo.png"
          alt="لوگوی شرکت"
          className="mx-auto h-24 w-auto object-contain"
        />
        <div className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">ساخته شده توسط</div>
        <div className="mt-3 bg-gradient-to-l from-brand to-violet-500 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
          محمد مهدی یوسفی
        </div>
        <p className="mt-3 text-xs leading-6 text-muted">
          با این باور که تحلیل درست، از داده درست شروع می‌شود.
        </p>
      </div>

      {/* امکانات */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="card p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <f.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <div className="text-sm font-bold">{f.title}</div>
            <p className="mt-1 text-[11px] leading-5 text-muted">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* داده‌ها */}
      <div className="card p-5 text-center">
        <div className="text-xs font-bold">منابع داده</div>
        <p className="mt-2 text-[11px] leading-6 text-muted">
          داده‌های لحظه‌ای و تاریخی: TSETMC · اسناد رسمی: سامانه کدال · اخبار: رسانه‌های اقتصادی معتبر
        </p>
      </div>

      {/* دیسکلایر */}
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-center">
        <p className="text-[11px] leading-6 text-muted">
          ⚠️ تحلیل‌های این پلتفرم توسط هوش مصنوعی و الگوریتم‌های ریاضی تولید می‌شود و صرفاً جنبه
          اطلاع‌رسانی دارد؛ توصیه خرید و فروش محسوب نمی‌شود. مسئولیت تصمیم‌های سرمایه‌گذاری با خود
          کاربر است.
        </p>
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs font-bold text-brand hover:underline">
          ← بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
