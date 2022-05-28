import { css } from "@emotion/react";
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
  NextPage,
} from "next";
import dynamic from "next/dynamic";
import Head from "next/head";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { getPrices } from "../repository";

const DynamicDrawdownsChart = dynamic(import("../components/DrawdownsChart"), {
  ssr: false,
});

import { Drawdown, Price, RawDate, RawPrice } from "../types";

export const getStaticProps: GetStaticProps<
  { prices: RawPrice[] | null },
  { page: string[] }
> = async (ctx) => {
  const stockName = ctx.params?.page?.[0] ?? "";
  const prices = await getPrices(stockName);
  const rawPrices =
    prices?.map<RawPrice>(({ date, ...rest }) => ({
      date: date.toISOString(),
      ...rest,
    })) ?? null;
  return { props: { prices: rawPrices }, revalidate: 5 };
};

export const getStaticPaths: GetStaticPaths = () => ({
  fallback: true,
  paths: ["/smt"],
});

const Home = ({
  prices: rawPrices,
}: InferGetStaticPropsType<typeof getStaticProps>): JSX.Element => {
  const prices = useMemo<Price[] | null>(
    () =>
      rawPrices?.map(({ date, ...rest }) => ({
        date: new Date(date),
        ...rest,
      })) ?? null,
    [rawPrices]
  );

  return (
    <div>
      <div>
        {prices ? (
          <DynamicDrawdownsChart prices={prices} />
        ) : (
          <span>Not found</span>
        )}
      </div>
    </div>
  );
};

export default Home;
