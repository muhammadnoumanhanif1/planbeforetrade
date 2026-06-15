## Plan: Add manual entry price input to liquidation calculator

The liquidation calculator already accepts `entryPrice` in the shared calculation library, but the client page always substitutes the live coin price from the selected symbol. The implementation should add a per-holding entry price input directly under the Coin selector and above Holding qty, then pass that value into the existing calculation flow so liquidation results use the user’s manual entry price instead of the last market price.

**Steps**
1. Update the holding state in [src/app/liquidation-calculator/liquidation-calculator-client.tsx](src/app/liquidation-calculator/liquidation-calculator-client.tsx) to store an `entryPrice` string for each symbol slot, initialize it from the currently selected coin’s `lastPrice` when coins load, and preserve it when the user changes quantity or other fields.
2. Change `buildSlotSummary()` in [src/app/liquidation-calculator/liquidation-calculator-client.tsx](src/app/liquidation-calculator/liquidation-calculator-client.tsx) so the calculated `PositionInput.entryPrice` comes from the new per-holding input, not `selectedCoin.lastPrice`, while still exposing the live `currentPrice` for comparison in the UI.
3. Add a new numeric input in the selector grid on the liquidation calculator page, positioned under Coin and above Holding qty, with the same field styling and validation UX as the other controls. Keep current price as a separate read-only display card so users can compare manual entry price against live market price.
4. Review the calculation summary and error messaging to ensure invalid or blank entry prices surface the existing library validation message instead of silently falling back to the market price.
5. Extend [tests/liquidation-calculator.test.ts](tests/liquidation-calculator.test.ts) with a case that proves manual entry price overrides the live coin price and still produces valid results.

**Relevant files**
- [src/app/liquidation-calculator/liquidation-calculator-client.tsx](src/app/liquidation-calculator/liquidation-calculator-client.tsx) - holds the client state, coin loading, slot summary logic, and the render order for Coin / Holding qty controls.
- [src/app/liquidation-calculator/page.module.css](src/app/liquidation-calculator/page.module.css) - likely no structural CSS changes are needed, but this is the place to adjust spacing if the new field causes wrapping issues.
- [src/lib/liquidation-calculator.ts](src/lib/liquidation-calculator.ts) - already validates and calculates from `PositionInput.entryPrice`; reuse as-is unless the client flow exposes a mismatch.
- [tests/liquidation-calculator.test.ts](tests/liquidation-calculator.test.ts) - add coverage for manual entry price behavior.

**Verification**
1. Run the liquidation calculator vitest file and confirm the new manual-entry-price test passes.
2. Check the liquidation calculator page in the browser and verify the new Entry price field appears between Coin and Holding qty for each active trade slot.
3. Confirm changing the Entry price changes the liquidation output while the Current price card still shows the fetched live price.
4. If the page or CSS layout shifts, verify the selector grid still wraps cleanly at narrower widths.

**Decisions**
- Keep the live coin price visible as a comparison signal, but make the entry price field the actual driver for liquidation math.
- Treat blank or invalid entry price as a validation failure instead of silently defaulting back to the current market price.
- Do not change the shared calculation formulas in [src/lib/liquidation-calculator.ts](src/lib/liquidation-calculator.ts) because they already support the required input shape.

**Further Considerations**
1. Do you want the Entry price to auto-populate from the selected coin’s live price on coin change, or remain editable after initialization? Recommendation: auto-populate on coin change, then let the user override it.
2. Should the label say `Entry price` or `Avg entry price`? Recommendation: use `Entry price` because it matches the calculation input and is shorter in the current grid.
