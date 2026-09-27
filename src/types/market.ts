export interface MarketOverview {
  indexLastValue: number;
  indexChange: number;
  indexEqualWeightedLastValue: number;
  indexEqualWeightedChange: number;
  marketActivityDEven: number;
  marketActivityHEven: number;
  marketActivityZTotTran: number;
  marketActivityQTotCap: number;
  marketActivityQTotTran: number;
  marketState: string;
  marketStateTitle: string;
  marketValue: number;
}

export interface MoverRow {
  insCode: string;
  symbol: string;
  name: string;
  type: string;
  last: number;
  closing: number;
  yesterday: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  value: number;
  trades: number;
  lastPct: number;
  closingPct: number;
  allowedMax: number;
  allowedMin: number;
  eps: number;
  pe: string | null;
}

export interface MoversResponse {
  gainers: MoverRow[];
  losers: MoverRow[];
  active: MoverRow[];
  updatedAt: number;
}

export interface SearchResult {
  insCode: string;
  symbol: string;
  name: string;
  flow: number;
  type: string;
}

export interface Quote {
  insCode: string;
  insId: string | null;
  symbol: string;
  name: string;
  type: string;
  marketTitle: string | null;
  subSector: string | null;
  sectorCode: string | null;
  last: number;
  closing: number;
  yesterday: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  value: number;
  trades: number;
  allowedMax: number;
  allowedMin: number;
  lastPct: number;
  closingPct: number;
  state: string;
  date: number;
  time: number;
  eps: number | null;
  pe: string | null;
  sectorName: string | null;
  sectorPE: number | null;
  yearMin: number | null;
  yearMax: number | null;
  weekMin: number | null;
  weekMax: number | null;
  monthAvgVolume: number | null;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
