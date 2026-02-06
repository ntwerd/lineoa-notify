const GOLD_PRICE_ENDPOINT = "https://data-asg.goldprice.org/dbXRates/USD";

export interface XauPrice {
  price: number;
  change: number;
  percentChange: number;
  closePrice: number;
  updatedAt: Date;
  rawTimestamp: number;
  humanReadableTime: string;
}

interface GoldPriceApiResponse {
  ts: number;
  date: string;
  items: Array<{
    curr: string;
    xauPrice: number;
    chgXau?: number;
    pcXau?: number;
    xauClose?: number;
  }>;
}

const isValidResponse = (value: unknown): value is GoldPriceApiResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.ts !== "number" || typeof candidate.date !== "string" ||
    !Array.isArray(candidate.items)
  ) {
    return false;
  }

  return true;
};

/**
 * Fetches the latest XAU/USD price from goldprice.org.
 */
export const fetchLatestXauUsdPrice = async (): Promise<XauPrice> => {
  const response = await fetch(GOLD_PRICE_ENDPOINT, {
    headers: {
      // The API occasionally rejects requests without a user agent.
      "User-Agent": "lineoa-notify/1.0 (+https://supabase.com)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch XAU price: ${response.status} ${response.statusText}`,
    );
  }

  const json = await response.json();
  if (!isValidResponse(json) || json.items.length === 0) {
    throw new Error("Unexpected XAU price response structure");
  }

  const usdEntry = json.items.find((item) => item.curr === "USD");
  if (!usdEntry) {
    throw new Error("USD price not found in response");
  }

  const {
    xauPrice,
    chgXau = 0,
    pcXau = 0,
    xauClose = 0,
  } = usdEntry;

  const updatedAt = new Date(json.ts);
  const bangkokFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return {
    price: xauPrice,
    change: chgXau,
    percentChange: pcXau,
    closePrice: xauClose,
    updatedAt,
    rawTimestamp: json.ts,
    humanReadableTime: bangkokFormatter.format(updatedAt),
  };
};
