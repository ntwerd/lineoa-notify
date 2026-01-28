// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { fetchLatestXauUsdPrice } from "./get-data.ts";
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


Deno.serve(async () => {
  try {

    const data = {
      timeStamp: new Date().toISOString(),
    };

    const channelAccessToken = getRequiredEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const recipientId = getRequiredEnv("LINE_RECIPIENT_ID");

    const xauPrice = await fetchLatestXauUsdPrice();

    const priceText = currencyFormatter.format(xauPrice.price);

    const messageLines = [
      "XAU/USD spot update",
      `Price: ${priceText}`,

    ];

    const lineResponse = await sendLinePushMessage({
      channelAccessToken,
      to: recipientId,
      messages: [{
        type: "text",
        text: messageLines.join("\n"),
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
