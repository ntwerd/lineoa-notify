// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchLatestXauUsdPrice } from "./get-goldprice.ts";
import { fetchStockQuotes } from "./get-stockprice.ts";
import sendLinePushMessage from "./line-message.ts";

const getRequiredEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value || !value.trim()) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatSignedCurrency = (value: number): string => {
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) {
    return `+${formatted}`;
  }
  if (value < 0) {
    return `-${formatted}`;
  }
  return formatted;
};

const formatSignedPercent = (value: number): string => {
  const formatted = percentFormatter.format(Math.abs(value));
  if (value > 0) {
    return `+${formatted}%`;
  }
  if (value < 0) {
    return `-${formatted}%`;
  }
  return `${formatted}%`;
};

const formatGmt7HourStamp = (): string => {
  const now = new Date();

  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    hour12: false,
  }).format(now);

  return `${datePart} ${hourPart}:00`;
};


Deno.serve(async () => {
  try {

    const data = {
      timeStamp: new Date().toISOString(),
    };

    const channelAccessToken = getRequiredEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const recipientId = getRequiredEnv("LINE_RECIPIENT_ID");

    const xauPrice = await fetchLatestXauUsdPrice();
    const stockQuotes = await fetchStockQuotes(
      getRequiredEnv("ALPHA_VANTAGE_API_KEY"),
    );

    const priceText = currencyFormatter.format(xauPrice.price);
    const stockLines = stockQuotes.map((quote) => {
      const lastPrice = currencyFormatter.format(quote.close);
      // const changeText = formatSignedCurrency(quote.change);
      // const changePercentText = formatSignedPercent(quote.changePercent);
      return `${quote.symbol}: ${lastPrice}`;
    });

    const altText = [
      formatGmt7HourStamp(),
      `XAU: ${priceText}`,
      ...stockLines,
    ].join(" | ");

    const flexBodyContents: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: formatGmt7HourStamp(),
        size: "sm",
        color: "#888888",
        margin: "sm",
      },
      {
        type: "separator",
        margin: "md",
      },
      {
        type: "text",
        text: `XAU: ${priceText}`,
        weight: "bold",
        size: "md",
        margin: "md",
      },
    ];

    if (stockLines.length > 0) {
      flexBodyContents.push(
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "text",
          text: "Stocks",
          weight: "bold",
          size: "sm",
          margin: "md",
        },
        ...stockLines.map((line) => ({
          type: "text",
          text: line,
          size: "sm",
          wrap: true,
          margin: "sm",
        })),
      );
    }

    const flexMessage: Record<string, unknown> = {
      type: "flex",
      altText,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: flexBodyContents,
        },
      },
    };

    const lineResponse = await sendLinePushMessage({
      channelAccessToken,
      to: recipientId,
      messages: [{
        ...flexMessage,
      }],
      notificationDisabled: true,
    });

    return new Response(
      JSON.stringify(
        {
          data,
          xauPrice,
          linePush: {
            status: lineResponse.status,
            statusText: lineResponse.statusText,
          },
        },
      ),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location 'http://127.0.0.1:54321/functions/v1/xau-price' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{}'

*/
