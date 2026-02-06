const ALPHAVANTAGE_ENDPOINT = "https://www.alphavantage.co/query";
const BULK_QUOTES_FUNCTION = "REALTIME_BULK_QUOTES";

export const DEFAULT_STOCK_SYMBOLS = ["SLVR", "SILJ", "SLVP"] as const;

export type StockQuoteSymbol = typeof DEFAULT_STOCK_SYMBOLS[number];

export interface StockQuote {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
  extendedHoursQuote?: number;
  extendedHoursChange?: number;
  extendedHoursChangePercent?: number;
}

interface AlphaVantageBulkQuoteEntry {
  symbol: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  change_percent: string;
  extended_hours_quote?: string;
  extended_hours_change?: string;
  extended_hours_change_percent?: string;
}

interface AlphaVantageBulkQuoteResponse {
  endpoint?: string;
  message?: string;
  data?: AlphaVantageBulkQuoteEntry[];
  "Error Message"?: string;
  "Information"?: string;
  "Note"?: string;
}

const isBulkQuoteResponse = (
  value: unknown,
): value is AlphaVantageBulkQuoteResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if ("data" in candidate && !Array.isArray(candidate.data)) {
    return false;
  }

  return true;
};

const normalizeNumericString = (value: string): string =>
  value.replace(/[% ,]/g, "").trim();

const parseRequiredNumber = (
  value: string,
  field: string,
  symbol: string,
): number => {
  const parsed = Number(normalizeNumericString(value));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field} value for ${symbol}`);
  }
  return parsed;
};

const parseOptionalNumber = (
  value: string | undefined,
  field: string,
  symbol: string,
): number | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return parseRequiredNumber(value, field, symbol);
};

/**
 * Fetches realtime stock quotes for the provided symbols from Alpha Vantage.
 */
export const fetchStockQuotes = async (
  apiKey: string,
  symbols: readonly string[] = DEFAULT_STOCK_SYMBOLS,
): Promise<StockQuote[]> => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Alpha Vantage API key is required");
  }

  const cleanedSymbols = symbols
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0);

  if (cleanedSymbols.length === 0) {
    throw new Error("At least one stock symbol is required");
  }

  if (cleanedSymbols.length > 100) {
    throw new Error("Alpha Vantage supports up to 100 symbols per request");
  }

  const url = new URL(ALPHAVANTAGE_ENDPOINT);
  url.searchParams.set("function", BULK_QUOTES_FUNCTION);
  url.searchParams.set("symbol", cleanedSymbols.join(","));
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "lineoa-notify/1.0 (+https://supabase.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch stock quotes: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();
  if (!isBulkQuoteResponse(json)) {
    throw new Error("Unexpected Alpha Vantage response structure");
  }

  if (json["Error Message"]) {
    throw new Error(json["Error Message"]);
  }

  if (json["Information"]) {
    throw new Error(json["Information"]);
  }

  if (json["Note"]) {
    throw new Error(json["Note"]);
  }

  if (json.message && (!json.data || json.data.length === 0)) {
    throw new Error(json.message);
  }

  const data = json.data ?? [];
  if (data.length === 0) {
    throw new Error("No stock quote data returned");
  }

  return data.map((entry) => {
    const symbol = entry.symbol ?? "UNKNOWN";

    return {
      symbol,
      timestamp: entry.timestamp,
      open: parseRequiredNumber(entry.open, "open", symbol),
      high: parseRequiredNumber(entry.high, "high", symbol),
      low: parseRequiredNumber(entry.low, "low", symbol),
      close: parseRequiredNumber(entry.close, "close", symbol),
      volume: parseRequiredNumber(entry.volume, "volume", symbol),
      previousClose: parseRequiredNumber(
        entry.previous_close,
        "previous_close",
        symbol,
      ),
      change: parseRequiredNumber(entry.change, "change", symbol),
      changePercent: parseRequiredNumber(
        entry.change_percent,
        "change_percent",
        symbol,
      ),
      extendedHoursQuote: parseOptionalNumber(
        entry.extended_hours_quote,
        "extended_hours_quote",
        symbol,
      ),
      extendedHoursChange: parseOptionalNumber(
        entry.extended_hours_change,
        "extended_hours_change",
        symbol,
      ),
      extendedHoursChangePercent: parseOptionalNumber(
        entry.extended_hours_change_percent,
        "extended_hours_change_percent",
        symbol,
      ),
    };
  });
};
