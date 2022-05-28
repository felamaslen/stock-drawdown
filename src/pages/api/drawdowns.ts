import { NextApiRequest, NextApiResponse } from "next";

import { getPrices } from "../../repository";
import { Drawdown } from "../../types";
import { parseDrawdowns } from "../../utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ drawdowns: Drawdown[] } | { message: string }>
) {
  const name = req.query.name;
  if (!(name && typeof name === "string")) {
    res.status(400).json({ message: "Must set name as string in query" });
    return;
  }

  const prices = await getPrices(name);

  if (!prices) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const drawdowns = parseDrawdowns(prices);
  res.status(200).json({ drawdowns });
}
