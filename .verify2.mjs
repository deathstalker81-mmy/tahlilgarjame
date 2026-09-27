import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: "new", executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", args: ["--no-sandbox","--disable-gpu"] });
const p = await b.newPage(); const errs = [];
p.on("pageerror", e => errs.push(String(e).slice(0,80)));
await p.goto("http://localhost:3000/stock/46348559193224090", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 4000));
// برو تب فاندامنتال و تحلیل رو بزن
const btns = await p.$$("button");
for (const t of btns) { const x = await t.evaluate(el => el.textContent); if (x?.includes("تحلیل فاندامنتال")) { await t.click(); break; } }
await new Promise(r => setTimeout(r, 1000));
const startBtns = await p.$$("button");
for (const t of startBtns) { const x = await t.evaluate(el => el.textContent); if (x?.includes("شروع تحلیل فاندامنتال")) { await t.click(); break; } }
// صبر تا تمام شدن (تا ۶۰ ثانیه)
let done = false;
for (let i = 0; i < 12; i++) { await new Promise(r => setTimeout(r, 5000)); const tx = await p.evaluate(() => document.body.innerText); if (tx.includes("امتیاز ارزش‌گذاری") || tx.includes("ارزش خرید") || tx.includes("قیمت منصفانه")) { done = true; break; } }
console.log("تحلیل تمام شد:", done ? "✓" : "?");
// حالا برو تب تکنیکال و برگرد
const btns2 = await p.$$("button");
for (const t of btns2) { const x = await t.evaluate(el => el.textContent); if (x?.includes("تحلیل تکنیکال")) { await t.click(); break; } }
await new Promise(r => setTimeout(r, 1500));
const btns3 = await p.$$("button");
for (const t of btns3) { const x = await t.evaluate(el => el.textContent); if (x?.includes("تحلیل فاندامنتال")) { await t.click(); break; } }
await new Promise(r => setTimeout(r, 2000));
const text = await p.evaluate(() => document.body.innerText);
console.log("بعد از تعویض تب، نتیجه هنوز هست؟", text.includes("ارزش خرید") || text.includes("قیمت منصفانه") ? "✓ می‌مونه!" : "✗ پریده");
console.log("errors:", errs.length);
await b.close();
