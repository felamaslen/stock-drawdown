export type RawDate<T> = T extends { date: Date }
  ? Omit<T, "date"> & { date: string }
  : T;

export type NativeDate<T> = T extends { date: string }
  ? Omit<T, "date"> & { date: Date }
  : T;
