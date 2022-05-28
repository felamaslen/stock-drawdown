import { RawDate } from "./date";

export type Price = {
  date: Date;
  price: number;
  open: number;
  high: number;
  low: number;
  changePct: number;
};

export type RawPrice = Omit<Price, "date"> & { date: string };

export type Drawdown = {
  top: Pick<Price, "date" | "price"> & { index: number };
  bottom: Pick<Price, "date" | "price"> & { index: number };
  declinePct: number;
  recovery?: Pick<Price, "date"> & { index: number };
  daysTopToBottom: number;
  daysBottomToRecovery: number | null;
};
