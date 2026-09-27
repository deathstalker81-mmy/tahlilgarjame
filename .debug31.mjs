import { readFileSync } from "fs";
const html = readFileSync(".cache/fin-sample.html", "utf8");
const rows = [];
for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
  const cells = [];
  for (const td of tr.match(/<(?:td|th)[^>]*>[\s\S]*?<\/(?:td|th)>/gi) ?? []) {
    const txt = td.replace(/<[^>]+>/g, " ").replace(/&#160;|&nbsp;|\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const sm = td.match(/colspan\s*=\s*"?(\d+)"?/i);
    const span = sm ? Math.min(Number(sm[1]), 8) : 1;
    for (let s = 0; s < span; s++) cells.push(txt);
  }
  if (cells.some((c) => c.length > 0)) rows.push(cells);
}
const epsIdx = rows.findIndex((r) => r.some((c) => /سود هر سهم/.test(c)));
console.log("eps row index:", epsIdx, "| total:", rows.length);
if (epsIdx > 0) {
  console.log("eps row:", rows[epsIdx].join(" | ").slice(0, 200));
  console.log("قبلش:", rows[epsIdx - 1].join(" | ").slice(0, 200));
  console.log("دو تا قبلش:", rows[epsIdx - 2].join(" | ").slice(0, 200));
} else {
  console.log("سود هر سهم اصلا نیست! جستجوی مشابه:");
  for (const r of rows) { if (/سهم/.test(r[0] ?? "")) console.log(" •", r.join(" | ").slice(0, 100)); }
}
