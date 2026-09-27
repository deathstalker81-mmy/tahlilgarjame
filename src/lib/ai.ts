const BASE = process.env.AI_BASE_URL || "https://api.avalai.ir/v1";
const KEY = process.env.AI_API_KEY || "";

export function aiConfigured(): boolean {
  return KEY.length > 10;
}

/** اولین آبجکت JSON کامل را با شمارش براکت‌ها پیدا می‌کند (نادیده گرفتن رشته‌ها) */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function tryParse(t: string): unknown | null {
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** حتی اگر خروجی مدل خراب/قطع شده باشد تلاش می‌کند JSON سالم بیرون بکشد */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();

  // ۱) استخراج دقیق اولین آبجکت کامل (زباله‌های بعد از JSON را حذف می‌کند)
  const clean = extractFirstJsonObject(t);
  if (clean) {
    const p = tryParse(clean);
    if (p !== null) return p;
  }

  // ۲) ترمیم قطع‌شدگی وسط آرایه
  const body = clean ?? t.slice(t.indexOf("{"));
  const lastObj = body.lastIndexOf("}");
  if (lastObj > 0) {
    const head = body.slice(0, lastObj + 1).replace(/,\s*$/, "");
    for (const suffix of ["]}", "}"]) {
      const repaired = tryParse(head + suffix);
      if (repaired !== null) return repaired;
    }
  }

  // ۳) خطوط جدید خام داخل رشته‌ها را escape و دوباره امتحان کن
  if (clean) {
    const escaped = clean.replace(/:\s*"[^"]*"/g, (m) => m.replace(/\n/g, "\\n").replace(/\r/g, ""));
    const p = tryParse(escaped);
    if (p !== null) return p;
  }

  console.error("[ai] unparseable raw:", JSON.stringify(text).slice(0, 600));
  throw new Error("پاسخ AI قابل تجزیه نبود");
}

export async function chatJSON<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  if (!aiConfigured()) throw new Error("NO_KEY");
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: opts.model || process.env.AI_MODEL_STRONG || "gpt-4.1",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_object" },
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2000,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("پاسخی از AI دریافت نشد");
  return extractJson(content) as T;
}
