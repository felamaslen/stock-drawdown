import csv from "csv-parser";
import {
  differenceInBusinessDays,
  format as formatDate,
  parse as parseDate,
} from "date-fns";
import fs from "fs-extra";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";

import { config } from "../../config";
import { Drawdown, Price } from "../../types";

const RAW_DIR = path.resolve(config.root, "src/prices");

// TODO: persistent database
const cache: Map<string, Price[]> = new Map();
let cacheEmpty = true;

const parseNumber = (value: string): number =>
  Number(value.replace(/[^\d\.]/g, ""));

const parsePrices = async (rawFile: string): Promise<Price[]> =>
  new Promise<Price[]>((resolve, reject) => {
    const results: Price[] = [];
    let done = false;

    fs.createReadStream(rawFile)
      .pipe(csv())
      .on("data", (data: Record<string, string>) => {
        const [date, price, open, high, low, , change] = Object.values(data);
        results.push({
          date: parseDate(date, "PP", new Date()),
          price: parseNumber(price),
          open: parseNumber(open),
          high: parseNumber(high),
          low: parseNumber(low),
          changePct: parseNumber(change.substring(0, change.length - 1)),
        });
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });

async function parseRawFiles(): Promise<Record<string, Price[]>> {
  const files = await fs.readdir(RAW_DIR);
  const parsed = await Promise.all(
    files
      .filter((file) => file.endsWith(".csv"))
      .map<Promise<Price[] | null>>(async (file) => {
        const filePath = path.resolve(RAW_DIR, file);
        const isFile = (await fs.stat(filePath)).isFile();
        return isFile ? parsePrices(filePath) : null;
      })
  );
  return parsed.reduce<Record<string, Price[]>>((prev, result, index) => {
    const filename = files[index];
    const name = filename.substring(0, filename.indexOf("."));
    return result ? { ...prev, [name]: result } : prev;
  }, {});
}

function getDrawdowns(prices: Price[]): Drawdown[] {
  const sortedPrices = prices
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return sortedPrices
    .reduce<{
      drawdowns: Pick<Drawdown, "top" | "bottom" | "recovery">[];
      hasDrawdown: boolean;
      prevPeak: null | Pick<Price, "date" | "price">;
      prevTrough: null | Pick<Price, "date" | "price">;
    }>(
      (reduction, { date, high, low }, index) => {
        if (reduction.prevPeak === null) {
          return {
            drawdowns: [],
            hasDrawdown: high > low,
            prevPeak: { date, price: high },
            prevTrough: { date, price: low },
          };
        }
        if (reduction.prevTrough === null) {
          return reduction;
        }

        const nextPeak =
          high > reduction.prevPeak.price
            ? { date, price: high }
            : reduction.prevPeak;
        const nextTrough =
          low < reduction.prevTrough.price
            ? { date, price: low }
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
                    recovery: recovered ? date : null,
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
        ? differenceInBusinessDays(recovery, bottom.date)
        : null,
    }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ drawdowns: Drawdown[] } | { message: string }>
) {
  if (cacheEmpty) {
    const newResults = await parseRawFiles();
    Object.entries(newResults).forEach(([key, value]) => {
      cache.set(key, value);
    });
    cacheEmpty = false;
  }

  const name = req.query.name;
  if (!(name && typeof name === "string")) {
    res.status(400).json({ message: "Must set name as string in query" });
    return;
  }
  if (!cache.has(name)) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const prices = cache.get(name) as Price[];
  const drawdowns = getDrawdowns(prices);

  res.status(200).json({ drawdowns });
}
