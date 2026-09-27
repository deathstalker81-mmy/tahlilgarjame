export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center sm:px-6">
        <p className="text-xs leading-6 text-muted">
          تحلیلگر جامع — تحلیل هوشمند بورس ایران با قدرت هوش مصنوعی
        </p>
        <p className="text-[11px] font-bold text-ink/80">
          ساخته شده توسط <span className="bg-gradient-to-l from-brand to-violet-500 bg-clip-text text-transparent">محمد مهدی یوسفی</span>
        </p>
        <p className="max-w-2xl text-[11px] leading-5 text-muted/70">
          تحلیل‌های این پلتفرم توسط هوش مصنوعی تولید می‌شود و صرفاً جنبه اطلاع‌رسانی دارد؛ توصیه خرید و فروش
          محسوب نمی‌شود. مسئولیت تصمیم‌های سرمایه‌گذاری با خود شماست.
        </p>
        <p className="text-[10px] text-muted/60">منبع داده: TSETMC</p>
      </div>
    </footer>
  );
}
