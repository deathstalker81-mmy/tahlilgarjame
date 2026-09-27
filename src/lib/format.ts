const faNum = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  n.toLocaleString("fa-IR", { maximumFractionDigits: 2, ...opts });

export function faPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return faNum(n, { maximumFractionDigits: 0 });
}

/** علامت مثبت/منفی همیشه سمت چپ عدد می‌شینه (ایزوله LTR برای متن RTL) */
export function faSigned(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const s = n >= 0 ? "+" : "−";
  return `\u2066${s}${faNum(Math.abs(n))}\u2069`;
}

export function faPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const v = Math.round(n * 100) / 100;
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `\u2066${s}${faNum(Math.abs(v))}٪\u2069`;
}

export function faInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return faNum(n, { maximumFractionDigits: 0 });
}

/** اعداد بزرگ: میلیارد / میلیون */
export function faCompactRial(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${faNum(n / 1e12, { maximumFractionDigits: 1 })} هزار میلیارد`;
  if (abs >= 1e9) return `${faNum(n / 1e9, { maximumFractionDigits: 1 })} میلیارد`;
  if (abs >= 1e6) return `${faNum(n / 1e6, { maximumFractionDigits: 1 })} میلیون`;
  if (abs >= 1e3) return `${faNum(n / 1e3, { maximumFractionDigits: 0 })} هزار`;
  return faNum(n);
}

/** ورودی ریال، خروجی تومان خوانا */
export function faToman(rial: number | null | undefined): string {
  if (rial === null || rial === undefined || rial === 0) return "—";
  return `${faCompactRial(rial / 10)} تومان`;
}

export function faVolume(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${faNum(n / 1e9, { maximumFractionDigits: 2 })} میلیارد`;
  if (abs >= 1e6) return `${faNum(n / 1e6, { maximumFractionDigits: 2 })} میلیون`;
  if (abs >= 1e3) return `${faNum(n / 1e3, { maximumFractionDigits: 1 })} هزار`;
  return faNum(n);
}

/** dEven 20260921 -> ۳۰ شهریور ۱۴۰۵ */
export function faDate(dEven: number | null | undefined): string {
  if (!dEven) return "—";
  const s = String(dEven);
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T12:00:00Z`;
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return s;
  }
}

/** timestamp -> ۳۰ شهریور ۱۴۰۵، ساعت ۱۴:۴۰ */
export function faDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    const date = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(ts));
    const time = new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(new Date(ts));
    return `${date}، ساعت ${time}`;
  } catch {
    return "—";
  }
}

/** timestamp -> «۱۵ دقیقه پیش» / «۲ ساعت پیش» / «۳ روز پیش» */
export function faRelativeTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "همین لحظه";
  if (mins < 60) return `${faNum(mins)} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${faNum(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${faNum(days)} روز پیش`;
  return faDateTime(ts);
}

/** hEven 114520 -> ۱۱:۴۵:۲۰ */
export function faTime(hEven: number | null | undefined): string {
  if (!hEven) return "—";
  const s = String(hEven).padStart(6, "0");
  const parts = [s.slice(0, 2), s.slice(2, 4), s.slice(4, 6)].map((p) => faNum(Number(p), { useGrouping: false }));
  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}
