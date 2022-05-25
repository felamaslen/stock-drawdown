import { RawDate } from "./date";

export type Price = {
  date: Date;
  price: number;
  open: number;
  high: number;
  low: number;
  changePct: number;
};

export type Drawdown = {
  top: Pick<Price, "date" | "price">;
  bottom: Pick<Price, "date" | "price">;
  declinePct: number;
  recovery: Date | null;
  daysTopToBottom: number;
  daysBottomToRecovery: number | null;
};

export type RawDrawdown = Omit<Drawdown, "top" | "bottom" | "recovery"> & {
  top: RawDate<Drawdown["top"]>;
  bottom: RawDate<Drawdown["bottom"]>;
  recovery: string | null;
};
