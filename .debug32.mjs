import { readFileSync } from "fs";
const html = readFileSync(".cache/fin-sample.html", "utf8");
const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
tables.forEach((t, i) => {
  const text = t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  if (/سال مالي ۱۳۹۹|سال مالی ۱۳۹۹|سال مالي ۱۴۰۰|۱۳۹۹\/۱۲\/۳۰/.test(text)) {
    console.log(`=== [${i}] rows=${(t.match(/<tr/gi) || []).length}`);
    (t.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).slice(0, 4).forEach((tr, j) => {
      const txt = tr.replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      console.log(`  r${j}: ${txt.slice(0, 170)}`);
    });
  }
});
