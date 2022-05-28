import csv from "csv-parser";
import {
  differenceInBusinessDays,
  format as formatDate,
  parse as parseDate,
} from "date-fns";
import fs from "fs-extra";
import path from "path";

import { config } from "../config";
import { Drawdown, Price } from "../types";

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

export async function getPrices(stockName: string): Promise<Price[] | null> {
  if (cacheEmpty) {
    const newResults = await parseRawFiles();
    Object.entries(newResults).forEach(([key, value]) => {
      cache.set(key, value);
    });
    cacheEmpty = false;
  }

  return cache.get(stockName) ?? null;
}
