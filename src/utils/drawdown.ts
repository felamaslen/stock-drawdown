import {
  differenceInBusinessDays,
  format as formatDate,
  parse as parseDate,
} from "date-fns";

import { Drawdown, Price } from "../types";

export function parseDrawdowns(prices: Price[]): {
  sortedPrices: Price[];
  drawdowns: Drawdown[];
} {
  const sortedPrices = prices
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const drawdowns = sortedPrices
    .reduce<{
      drawdowns: Pick<Drawdown, "top" | "bottom" | "recovery">[];
      hasDrawdown: boolean;
      prevPeak: null | Drawdown["top"];
      prevTrough: null | Drawdown["bottom"];
    }>(
      (reduction, { date, high, low }, index) => {
        if (reduction.prevPeak === null) {
          return {
            drawdowns: [],
            hasDrawdown: high > low,
            prevPeak: { date, index, price: high },
            prevTrough: { date, index, price: low },
          };
        }
        if (reduction.prevTrough === null) {
          return reduction;
        }

        const nextPeak =
          high > reduction.prevPeak.price
            ? { date, index, price: high }
            : reduction.prevPeak;
        const nextTrough =
          low < reduction.prevTrough.price
            ? { date, index, price: low }
            : reduction.prevTrough;

        const recovered = nextPeak.price > reduction.prevPeak.price;
        const atEnd = index === sortedPrices.length - 1;

        if (recovered || atEnd) {
          return {
            drawdowns: reduction.hasDrawdown
              ? [
                  ...reduction.drawdowns,
                  {
                    top: reduction.prevPeak,
                    bottom: reduction.prevTrough,
                    recovery: recovered ? { date, index } : undefined,
                  },
                ]
              : reduction.drawdowns,
            hasDrawdown: false,
            prevPeak: nextPeak,
            prevTrough: nextPeak,
          };
        }

        return {
          drawdowns: reduction.drawdowns,
          hasDrawdown: true,
          prevPeak: reduction.prevPeak,
          prevTrough: nextTrough,
        };
      },
      {
        drawdowns: [],
        hasDrawdown: false,
        prevPeak: null,
        prevTrough: null,
      }
    )
    .drawdowns.map<Drawdown>(({ top, bottom, recovery }) => ({
      top,
      bottom,
      declinePct: (-100 * (bottom.price - top.price)) / top.price,
      recovery,
      daysTopToBottom: differenceInBusinessDays(bottom.date, top.date),
      daysBottomToRecovery: recovery
        ? differenceInBusinessDays(recovery.date, bottom.date)
        : null,
    }));

  return { sortedPrices, drawdowns };
}
