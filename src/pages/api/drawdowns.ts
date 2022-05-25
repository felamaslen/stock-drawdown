import { NextApiRequest, NextApiResponse } from "next";

import { getDrawdowns } from "../../repository";
import { Drawdown } from "../../types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ drawdowns: Drawdown[] } | { message: string }>
) {
  const name = req.query.name;
  if (!(name && typeof name === "string")) {
    res.status(400).json({ message: "Must set name as string in query" });
    return;
  }

  const drawdowns = await getDrawdowns(name);

  if (!drawdowns) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  res.status(200).json({ drawdowns });
}
