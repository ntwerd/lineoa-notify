const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";
const MAX_MESSAGES = 5;

/**
 * Basic representation of a LINE message payload item. Extend this as needed
 * when working with more specific message structures such as Flex messages.
 */
export type LineMessage = Record<string, unknown>;

export interface LinePushRequestOptions {
  channelAccessToken: string;
  to: string;
  messages: LineMessage[];
  notificationDisabled?: boolean;
}

const validateOptions = (options: LinePushRequestOptions) => {
  const trimmedToken = options.channelAccessToken.trim();
  if (!trimmedToken) {
    throw new Error("channelAccessToken is required");
  }

  const trimmedTo = options.to.trim();
  if (!trimmedTo) {
    throw new Error("to is required");
  }

  if (!Array.isArray(options.messages) || options.messages.length === 0) {
    throw new Error("messages must contain at least one message");
  }

  if (options.messages.length > MAX_MESSAGES) {
    throw new Error(
      `LINE push API accepts at most ${MAX_MESSAGES} messages per request`,
    );
  }

  return {
    channelAccessToken: trimmedToken,
    payload: {
      to: trimmedTo,
      messages: options.messages,
      notificationDisabled: options.notificationDisabled ?? false,
    },
  };
};

/**
 * Perform a LINE push request using the Fetch API.
 */
export const sendLinePushMessage = async (
  options: LinePushRequestOptions,
): Promise<Response> => {
  const { channelAccessToken, payload } = validateOptions(options);

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch (_) {
      // ignore body read failures
    }
    throw new Error(
      `LINE push request failed with ${response.status} ${response.statusText}` +
        (errorBody ? `: ${errorBody}` : ""),
    );
  }

  return response;
};

export default sendLinePushMessage;
