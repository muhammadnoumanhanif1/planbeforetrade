export type TelegramMessageOptions = {
  chatId?: string;
  parseMode?: "Markdown" | "HTML";
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string }>>;
  };
};

export async function sendTelegramMessage(
  message: string,
  options?: TelegramMessageOptions
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[Telegram] TELEGRAM_BOT_TOKEN is not set");
    return false;
  }

  // Use options.chatId if provided, otherwise fall back to env TELEGRAM_CHAT_ID
  const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error("[Telegram] No chat ID configured");
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: options?.parseMode || "Markdown",
        reply_markup: options?.replyMarkup,
      }),
    });

    const data = await res.json();

    if (data.ok) {
      console.log(`[Telegram] Message sent to ${chatId}`);
      return true;
    } else {
      console.error(`[Telegram] API error:`, data.description);
      return false;
    }
  } catch (err) {
    console.error(`[Telegram] Fetch failed:`, err);
    return false;
  }
}