# 🚀 راهنمای انتشار (دیپلوی)

## گزینه ۱: لیارا (پیشنهادی — ایرانی، بدون تحریم برای کاربران)

۱. ثبت‌نام در [liara.ir](https://liara.ir) → ساخت اپ جدید → پلتفرم **Node.js**
۲. نصب CLI و دیپلوی (در پوشه پروژه):

```powershell
npm i -g @liara/cli
liara login
liara app create tahlilgar --platform nodejs --region iran
liara deploy
```

۳. **مهم — متغیرهای محیطی:** پنل لیارا → تنظیمات اپ → Environment Variables → این‌ها را بگذار:
```
AI_API_KEY=کلید-AvalAI-خودت
AI_BASE_URL=https://api.avalai.ir/v1
AI_MODEL_FAST=gemini-2.5-flash-lite
AI_MODEL_STRONG=gpt-4.1-mini
AI_MODEL_DEEP=gpt-4.1-mini
```
۴. تمام! آدرس: `https://tahlilgar.liara.run` — HTTPS و PWA خودکار ✓
۵. دامنه اختصاصی: تنظیمات → Domains → دامنه خودت را وصل کن

## گزینه ۲: سرور شخصی / VPS

```powershell
npm install
npm run build
npm run start   # پورت ۳۰۰۰ — با nginx معرفی کن به دامنه
```

## نکته‌ها
- کلید API هرگز در کد نیست — فقط در متغیرهای محیطی ✓
- پوشه `.cache` اسنپ‌شات بازار را نگه می‌دارد (در لیارا disk وصل شده)
- PWA نصب‌شدنی فقط با HTTPS معنا دارد — روی هاست خودکار است
