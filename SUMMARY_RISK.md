Summary of Risk Management Upgrades:

1. **`signalHistoryManager.ts`**:
   - Added `"BREAK_EVEN"` as a valid trade result status to accurately track trades that hit their trailing stop loss.
   - Updated `closeSignalRecord` to assign a 0 R-value when the trade closes at break-even.
   - Implemented `updateTrailingStop(record, currentPrice)`, a smart break-even trailing stop mechanism. It dynamically moves the stop-loss to the `entry_price` once the trade is 1.5R (1.5 times the initial risk) in profit.
   - Updated `checkSignalOutcome` to correctly resolve `"BREAK_EVEN"` if the stop-loss is hit but it is exactly at the entry price.

2. **`MarketStructureSignalsClient.tsx`**:
   - Updated the background tracking logic loop (where it checks if a signal has closed) to also invoke `updateTrailingStop`. This ensures any open positions actively track and adjust their stop-loss in real-time as the user leaves the page open.

3. **`signalGenerator.ts`**:
   - Upgraded the initial Stop Loss placement logic. It previously relied on a static `stopBuffer` offset which is vulnerable to "liquidity sweeps" (volatility spikes).
   - Replaced it with an `ATR` (Average True Range) volatility buffer multiplier (`1.5x` ATR). This allows the stop loss to adapt based on current market volatility (placing a wider stop on highly volatile coins and tighter stops on low-volatility ones), vastly improving the probability of the trade surviving normal price fluctuations without getting "hunted".