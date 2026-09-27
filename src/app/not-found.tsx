import Link from "next/link";
import { Home, Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-violet-500 shadow-glass">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">صفحه‌ای که دنبالش بودی پیدا نشد</h1>
        <p className="mt-2 text-sm text-muted">شاید نماد مورد نظر حذف شده یا آدرس اشتباه است.</p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-card transition-transform hover:opacity-90 active:scale-95"
      >
        <Home className="h-4 w-4" /> بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
