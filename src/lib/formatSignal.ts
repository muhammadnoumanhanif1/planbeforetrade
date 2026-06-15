/**
 * Escapes Telegram Markdown special characters in dynamic values so
 * user/data-derived content cannot break Markdown parsing.
 */
function escapeTelegramMarkdown(value: string | number | null | undefined): string {
  const text = String(value ?? "N/A");
  return text.replace(/([\\_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

/**
 * Signal price-like fields should remain human-readable in Telegram
 * (e.g. 0.00794 - 0.007968) without markdown backslashes.
 */
function formatSignalValue(value: string | number | null | undefined): string {
  return String(value ?? "N/A");
}

/**
 * Formats a signal object into a Telegram-friendly Markdown string.
 */
export function formatSignalMessage(signal: any): string {
  // Read from nested .signal if it exists (adapter for different shapes)
  const data = signal.signal ? signal.signal : signal;
  const status = signal.setup || data.status || 'NEW';

  // Determine emojis based on signal details
  const typeEmoji = data.action?.toUpperCase() === 'BUY' || data.type?.toUpperCase() === 'LONG' ? '🟢' : '🔴';
  const trendEmoji = data.trend?.toUpperCase() === 'UPTREND' ? '📈' : data.trend?.toUpperCase() === 'DOWNTREND' ? '📉' : '➖';
  
  // Create a clean entry zone display
  let entryDisplay = 'N/A';
  if (Array.isArray(data.entry_zone) && data.entry_zone.length >= 2) {
    entryDisplay = `${data.entry_zone[0]} - ${data.entry_zone[1]}`;
  } else if (data.entry_zone) {
    entryDisplay = String(data.entry_zone);
  }

  const message = `
📊 *SIGNAL ALERT*

*${escapeTelegramMarkdown(data.symbol)}* | ${typeEmoji} ${escapeTelegramMarkdown(data.action?.toUpperCase() || data.type?.toUpperCase() || 'UNKNOWN')}
${trendEmoji} Trend: ${escapeTelegramMarkdown(data.trend || 'N/A')}

💰 Entry Zone: ${formatSignalValue(entryDisplay)}
🛑 Stop Loss: ${formatSignalValue(data.stop_loss)}

🎯 TP1: ${formatSignalValue(data.tp1)}
🎯 TP2: ${formatSignalValue(data.tp2)}
🎯 TP3: ${formatSignalValue(data.tp3)}

🤖 AI Score: ${escapeTelegramMarkdown(data.ai_score || data.confidence || 0)}/100

⚡ Status: ${escapeTelegramMarkdown(status)}
`;

  return message.trim();
}
