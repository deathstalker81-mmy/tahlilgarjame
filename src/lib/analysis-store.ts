/**
 * کش مشترک تحلیل‌ها + تایپ‌های مشترک — بین روت‌ها (همان پروسه Node)
 */

export interface Claim {
  text: string;
  evidence: string;
}

export interface TechnicalAiResult {
  trend: "صعودی" | "نزولی" | "خنثی";
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

export interface TaggedNewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: number;
  category: string;
  sentiment: string;
  impact: number;
  reason: string;
}

export interface FundamentalAiData {
  financials: {
    symbol: string;
    name: string;
    price: number;
    lastPct: number;
    eps: number | null;
    pe: string | null;
    sectorName: string | null;
    sectorPE: number | null;
    yearMin: number | null;
    yearMax: number | null;
  };
  news: TaggedNewsItem[];
  analysis: {
    score: number;
    conclusion: "خرید" | "هولد" | "فروش";
    confidence: number;
    summary: string;
    positives: Claim[];
    negatives: Claim[];
    risks: string[];
    horizon: string;
    verified?: { checked: number; removed: number };
  } | null;
  aiError: string | null;
  updatedAt: number;
}

export const technicalStore = new Map<string, { t: number; data: TechnicalAiResult }>();
export const fundamentalStore = new Map<string, { t: number; data: FundamentalAiData }>();

export function getLatest<T>(store: Map<string, { t: number; data: T }>, insCode: string, ttlMs: number): T | null {
  const hit = store.get(insCode);
  if (hit && Date.now() - hit.t < ttlMs) return hit.data;
  return null;
}
