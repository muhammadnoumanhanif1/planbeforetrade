"""Cross-exchange liquidation price calculator for USDT-M perpetual futures.

This script compares liquidation prices across Binance, Bitget, and MEXC using
exchange-specific maintenance margin logic. It is designed for educational use
and should be validated against the live exchange risk tables before any real
trading decision.
"""

from __future__ import annotations

import argparse
from abc import ABC, abstractmethod
from dataclasses import dataclass, replace
from typing import Iterable, Literal, Sequence

try:
    from tabulate import tabulate
except ImportError:  # pragma: no cover - fallback for environments without tabulate.

    def tabulate(
        rows: Sequence[Sequence[object]],
        headers: Sequence[str],
        tablefmt: str = "github",
        floatfmt: str = ".2f",
    ) -> str:
        """Render a minimal GitHub-style table when tabulate is unavailable."""

        formatted_rows = [
            [format_cell(value, floatfmt=floatfmt) for value in row]
            for row in rows
        ]
        widths = [len(str(header)) for header in headers]
        for row in formatted_rows:
            for index, cell in enumerate(row):
                widths[index] = max(widths[index], len(cell))

        def build_row(values: Sequence[str]) -> str:
            return "| " + " | ".join(
                value.ljust(widths[index]) for index, value in enumerate(values)
            ) + " |"

        separator = "| " + " | ".join("-" * width for width in widths) + " |"
        output_lines = [build_row(list(headers)), separator]
        output_lines.extend(build_row(row) for row in formatted_rows)
        return "\n".join(output_lines)

try:
    import matplotlib.pyplot as plt
except ImportError:  # pragma: no cover - plotting is optional.
    plt = None


GREEN = "\033[32m"
RESET = "\033[0m"


@dataclass(frozen=True)
class PositionConfig:
    """User inputs needed to estimate liquidation prices."""

    entry_price: float
    leverage: float
    position_size_in_coin: float
    wallet_balance: float
    is_isolated: bool
    side: Literal["long", "short"] = "long"

    def __post_init__(self) -> None:
        """Validate the supplied position inputs."""

        if self.entry_price <= 0:
            raise ValueError("entry_price must be greater than zero.")
        if self.leverage <= 0:
            raise ValueError("leverage must be greater than zero.")
        if self.position_size_in_coin <= 0:
            raise ValueError("position_size_in_coin must be greater than zero.")
        if self.wallet_balance < 0:
            raise ValueError("wallet_balance cannot be negative.")
        normalized_side = self.side.lower()
        if normalized_side not in {"long", "short"}:
            raise ValueError("side must be either 'long' or 'short'.")
        object.__setattr__(self, "side", normalized_side)

    @property
    def side_sign(self) -> int:
        """Return 1 for a long position and -1 for a short position."""

        return 1 if self.side == "long" else -1

    @property
    def position_notional(self) -> float:
        """Return the position notional in quote currency."""

        return self.entry_price * self.position_size_in_coin

    @property
    def initial_margin(self) -> float:
        """Return the theoretical initial margin from the leverage setting."""

        return self.position_notional / self.leverage

    @property
    def margin_balance(self) -> float:
        """Return the effective margin balance used in liquidation math."""

        if self.is_isolated:
            return max(self.initial_margin, self.wallet_balance)
        return self.wallet_balance

    @property
    def margin_percent(self) -> float:
        """Return the effective margin as a percentage of notional."""

        return self.margin_balance / self.position_notional


class CryptoExchange(ABC):
    """Base class for exchange-specific liquidation calculations."""

    name: str
    maintenance_tiers: tuple[tuple[float, float], ...]

    def maintenance_margin_rate(self, notional: float) -> float:
        """Return the maintenance margin rate for the supplied notional."""

        for threshold, rate in self.maintenance_tiers:
            if notional <= threshold:
                return rate
        return self.maintenance_tiers[-1][1]

    def maintenance_margin_amount(self, position: PositionConfig) -> float:
        """Return the maintenance margin amount for the supplied position."""

        return position.position_notional * self.maintenance_margin_rate(
            position.position_notional
        )

    @abstractmethod
    def liquidation_price(self, position: PositionConfig) -> float:
        """Return the estimated liquidation price for the exchange."""

    def distance_to_liq(self, position: PositionConfig) -> float:
        """Return the directional percentage distance from entry to liquidation."""

        liq_price = self.liquidation_price(position)
        if position.side_sign > 0:
            distance = (position.entry_price - liq_price) / position.entry_price
        else:
            distance = (liq_price - position.entry_price) / position.entry_price
        return max(distance * 100.0, 0.0)


class BinanceExchange(CryptoExchange):
    """Binance liquidation model using tiered maintenance margin."""

    name = "Binance"
    maintenance_tiers = (
        (50_000.0, 0.0040),
        (250_000.0, 0.0050),
        (1_000_000.0, 0.0100),
        (5_000_000.0, 0.0200),
        (float("inf"), 0.0250),
    )

    def liquidation_price(self, position: PositionConfig) -> float:
        """Compute the Binance-style liquidation price."""

        maintenance_margin = self.maintenance_margin_amount(position)
        margin_balance = position.margin_balance
        liquidation = position.entry_price - position.side_sign * (
            (margin_balance - maintenance_margin) / position.position_size_in_coin
        )
        return max(liquidation, 0.0)


class BitgetExchange(CryptoExchange):
    """Bitget liquidation model using the margin ratio trigger."""

    name = "Bitget"
    maintenance_tiers = (
        (50_000.0, 0.0045),
        (250_000.0, 0.0060),
        (1_000_000.0, 0.0100),
        (5_000_000.0, 0.0200),
        (float("inf"), 0.0250),
    )

    def liquidation_price(self, position: PositionConfig) -> float:
        """Solve for the price where the Bitget margin ratio reaches 100%."""

        maintenance_margin = self.maintenance_margin_amount(position)
        position_margin = position.margin_balance
        liquidation = position.entry_price - position.side_sign * (
            (position_margin - maintenance_margin) / position.position_size_in_coin
        )
        return max(liquidation, 0.0)


class MEXCExchange(CryptoExchange):
    """MEXC liquidation model using fair-price trigger logic."""

    name = "MEXC"
    maintenance_tiers = (
        (50_000.0, 0.0040),
        (250_000.0, 0.0050),
        (1_000_000.0, 0.0075),
        (5_000_000.0, 0.0100),
        (float("inf"), 0.0125),
    )

    def liquidation_price(self, position: PositionConfig) -> float:
        """Compute the MEXC fair-price liquidation point."""

        maintenance_margin_pct = self.maintenance_margin_rate(position.position_notional)
        effective_margin_pct = position.margin_percent
        if position.side_sign > 0:
            liquidation = position.entry_price * (
                1.0 - effective_margin_pct + maintenance_margin_pct
            )
        else:
            liquidation = position.entry_price * (
                1.0 + effective_margin_pct - maintenance_margin_pct
            )
        return max(liquidation, 0.0)


def format_cell(value: object, floatfmt: str = ".2f") -> str:
    """Format values for the fallback table renderer."""

    if isinstance(value, float):
        return format(value, floatfmt)
    return str(value)


def build_exchanges() -> list[CryptoExchange]:
    """Return the exchange implementations used by the comparison table."""

    return [BinanceExchange(), BitgetExchange(), MEXCExchange()]


def display_comparison(
    position: PositionConfig,
    exchanges: Iterable[CryptoExchange] | None = None,
) -> str:
    """Display a side-by-side liquidation comparison table.

    The safest exchange is highlighted in green based on the greatest distance
    from entry to liquidation.
    """

    exchange_list = list(exchanges or build_exchanges())
    if position.leverage > 20:
        print(
            "Warning: leverage above 20x is extremely sensitive; small price moves can "
            "liquidate the position quickly."
        )

    results: list[dict[str, object]] = []
    for exchange in exchange_list:
        liquidation_price = exchange.liquidation_price(position)
        distance = exchange.distance_to_liq(position)
        results.append(
            {
                "exchange": exchange.name,
                "liquidation_price": liquidation_price,
                "distance_to_liq": distance,
            }
        )

    safest_index = max(
        range(len(results)), key=lambda index: float(results[index]["distance_to_liq"])
    )

    rows: list[list[object]] = []
    for index, result in enumerate(results):
        exchange_name = str(result["exchange"])
        liquidation_price = float(result["liquidation_price"])
        distance = float(result["distance_to_liq"])
        risk_label = "Safest" if index == safest_index else ""
        if index == safest_index:
            exchange_name = f"{GREEN}{exchange_name}{RESET}"
            risk_label = f"{GREEN}{risk_label}{RESET}"
        rows.append(
            [
                exchange_name,
                f"{liquidation_price:,.4f}",
                f"{distance:.2f}%",
                risk_label,
            ]
        )

    table = tabulate(
        rows,
        headers=["Exchange", "Liquidation Price", "Distance to Liq", "Risk"],
        tablefmt="github",
    )
    print(table)
    return table


def plot_liquidation_gap(
    position: PositionConfig,
    max_leverage: int = 50,
    exchanges: Iterable[CryptoExchange] | None = None,
) -> None:
    """Plot liquidation distance against leverage using matplotlib."""

    if plt is None:
        raise RuntimeError("matplotlib is not installed; plotting is unavailable.")
    if max_leverage < 1:
        raise ValueError("max_leverage must be at least 1.")

    exchange_list = list(exchanges or build_exchanges())
    leverage_values = list(range(1, max_leverage + 1))

    for exchange in exchange_list:
        distances = []
        for leverage in leverage_values:
            trial_position = replace(position, leverage=float(leverage))
            distances.append(exchange.distance_to_liq(trial_position))

        plt.plot(leverage_values, distances, marker="o", linewidth=2, label=exchange.name)

    plt.title("Liquidation Gap vs Leverage")
    plt.xlabel("Leverage (x)")
    plt.ylabel("Distance to Liquidation (%)")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.show()


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments for the calculator."""

    parser = argparse.ArgumentParser(
        description="Compare liquidation prices across Binance, Bitget, and MEXC."
    )
    parser.add_argument("--entry-price", type=float, default=60_000.0)
    parser.add_argument("--leverage", type=float, default=10.0)
    parser.add_argument("--position-size", type=float, default=0.01)
    parser.add_argument("--wallet-balance", type=float, default=100.0)
    parser.add_argument("--isolated", action="store_true")
    parser.add_argument("--side", choices=("long", "short"), default="long")
    parser.add_argument("--show-plot", action="store_true")
    return parser.parse_args()


def main() -> None:
    """Run the calculator from the command line."""

    args = parse_args()
    position = PositionConfig(
        entry_price=args.entry_price,
        leverage=args.leverage,
        position_size_in_coin=args.position_size,
        wallet_balance=args.wallet_balance,
        is_isolated=args.isolated,
        side=args.side,
    )
    display_comparison(position)
    if args.show_plot:
        plot_liquidation_gap(position)


if __name__ == "__main__":
    main()